/**
 * DataContext for DJ Grain Hub
 *
 * API-backed data store. Fetches from the Express backend when the
 * user is authenticated and re-fetches whenever the user changes
 * (login / logout). All JSON db/ file imports have been removed.
 *
 * The context interface is intentionally unchanged so no page-level
 * component needs to be modified.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';
import type { AuthUser } from './auth';
import type {
  Machine,
  Product,
  Sale,
  SaleItem,
  Alert,
  UserRecord,
  Report,
} from './dataHelpers';

// ─── API → frontend type mappers ──────────────────────────────────────

function mapProduct(p: any): Product {
  // If no imageUrl but has imageBlob/imageMimeType, construct URL to blob endpoint
  let imageUrl = p.imageUrl || '';
  if (!imageUrl && p.imageMimeType) {
    imageUrl = `/api/products/${p.id}/image`;
  }
  
  return {
    id: p.id,
    machineId: p.machineId,
    slotNumber: p.slotNumber,
    name: p.name,
    price: Number(p.price),
    cost: Number(p.cost),
    weight: Number(p.weight),
    stock: p.stock,
    imageUrl,
  };
}

function mapMachine(m: any): Machine {
  return {
    id: m.id,
    name: m.name,
    location: m.location,
    lat: m.lat ?? undefined,
    lng: m.lng ?? undefined,
    ownerId: m.ownerId,
    status: m.status as Machine['status'],
    capacity: m.capacity,
    lastRefill: m.lastRefill ? new Date(m.lastRefill).toISOString() : '',
    earnings: Number(m.earnings),
    alerts: m.alertCount ?? m._count?.alerts ?? 0,
    products: m.products?.map(mapProduct),
  };
}

function mapSale(s: any): Sale {
  return {
    id: s.id,
    machineId: s.machineId,
    items: (s.items || []).map((item: any): SaleItem => ({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.unitPrice ?? item.price ?? 0),
    })),
    totalPrice: Number(s.totalPrice),
    timestamp: s.timestamp ? new Date(s.timestamp).toISOString() : new Date().toISOString(),
    status: s.status as Sale['status'],
  };
}

function mapAlert(a: any): Alert {
  return {
    id: a.id,
    machineId: a.machineId,
    type: a.type,
    severity: a.severity as Alert['severity'],
    message: a.message,
    timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : new Date().toISOString(),
    status: a.status as Alert['status'],
  };
}

function mapUser(u: any): UserRecord {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    password: '', // never returned by API
    role: u.role,
    accessRole: u.accessRole as UserRecord['accessRole'],
    status: u.status,
    ownedMachineId: u.ownedMachineId || '',
  };
}

function mapReport(r: any): Report {
  return {
    id: r.id,
    machineId: r.machineId,
    category: r.category,
    message: r.message,
    name: r.name ?? r.reporterName ?? '',
    mobileNumber: r.mobileNumber ?? r.reporterMobile ?? '',
    timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
    status: r.status as Report['status'],
  };
}

// ─── Context Types ───────────────────────────────────────────────────

interface DataContextType {
  // ── Raw data ──
  machines: Machine[];
  products: Product[];
  sales: Sale[];
  alerts: Alert[];
  users: UserRecord[];
  reports: Report[];

  // ── Loading state ──
  isLoading: boolean;

  // ── Enriched machines (products joined) ──
  enrichedMachines: Machine[];

  // ── Filtered getters ──
  getMachinesForUser: (user: AuthUser) => Machine[];
  getProductsForMachine: (machineId: string) => Product[];
  getSalesForUser: (user: AuthUser) => Sale[];
  getAlertsForUser: (user: AuthUser) => Alert[];
  getReportsForUser: (user: AuthUser) => Report[];

  // ── Lookup helpers ──
  getMachineName: (machineId: string) => string;
  getProductName: (productId: string) => string;

  // ── Machine CRUD ──
  addMachine: (machine: Machine) => void;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;

  // ── Product CRUD ──
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // ── Report mutations ──
  addReport: (report: Report) => Promise<Report>;
  updateReportStatus: (id: string, status: Report['status']) => Promise<void>;

  // ── Alert mutations ──
  updateAlertStatus: (id: string, status: Alert['status']) => void;

  // ── Sale mutations ──
  addSale: (sale: Sale) => void;

  // ── User CRUD ──
  addUser: (user: UserRecord) => void;
  updateUser: (id: string, updates: Partial<UserRecord>) => void;
  deleteUser: (id: string) => void;

  // ── Stock management ──
  decrementStock: (productId: string, quantity: number) => void;

  // ── Manual refresh ──
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ─── Helper: visible machine IDs for a user ──────────────────────────
function getVisibleMachineIds(user: AuthUser): string[] | null {
  if (user.accessRole === 'super_admin') return null; // sees all
  return user.ownedMachineId ? [user.ownedMachineId] : [];
}

// ─── Provider ────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── Load all data from API ──
  const loadAllData = useCallback(async (currentUser: typeof user) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [machinesRaw, salesRaw, alertsRaw, reportsRaw] = await Promise.all([
        api.get<any[]>('/machines'),
        api.get<{ sales: any[] }>('/sales?limit=500'),
        api.get<any[]>('/alerts'),
        api.get<any[]>('/reports'),
      ]);

      setMachines(machinesRaw.map(mapMachine));
      // Extract flat products from embedded machine products
      setProducts(machinesRaw.flatMap((m: any) => (m.products || []).map(mapProduct)));
      setSales((salesRaw.sales || []).map(mapSale));
      setAlerts(alertsRaw.map(mapAlert));
      setReports(reportsRaw.map(mapReport));

      // Users only visible to super_admin
      if (currentUser.accessRole === 'super_admin') {
        const usersRaw = await api.get<any[]>('/users');
        setUsers(usersRaw.map(mapUser));
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('[DataContext] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Reload when auth user changes (login / logout) ──
  useEffect(() => {
    if (user) {
      loadAllData(user);
    } else {
      setMachines([]);
      setProducts([]);
      setSales([]);
      setAlerts([]);
      setUsers([]);
      setReports([]);
    }
  }, [user, loadAllData]);

  const refreshData = useCallback(() => {
    if (user) loadAllData(user);
  }, [user, loadAllData]);

  // ── Enriched machines: join products ──
  const enrichedMachines = useMemo(
    () =>
      machines.map(m => ({
        ...m,
        products: products
          .filter(p => p.machineId === m.id)
          .sort((a, b) => a.slotNumber - b.slotNumber),
      })),
    [machines, products]
  );

  // ── Filtered getters ──
  const getMachinesForUserFn = useCallback(
    (authUser: AuthUser): Machine[] => {
      const ids = getVisibleMachineIds(authUser);
      if (ids === null) return enrichedMachines;
      return enrichedMachines.filter(m => ids.includes(m.id));
    },
    [enrichedMachines]
  );

  const getProductsForMachineFn = useCallback(
    (machineId: string): Product[] =>
      products.filter(p => p.machineId === machineId).sort((a, b) => a.slotNumber - b.slotNumber),
    [products]
  );

  const getSalesForUserFn = useCallback(
    (authUser: AuthUser): Sale[] => {
      const ids = getVisibleMachineIds(authUser);
      if (ids === null) return sales;
      return sales.filter(s => ids.includes(s.machineId));
    },
    [sales]
  );

  const getAlertsForUserFn = useCallback(
    (authUser: AuthUser): Alert[] => {
      const ids = getVisibleMachineIds(authUser);
      if (ids === null) return alerts;
      return alerts.filter(a => ids.includes(a.machineId));
    },
    [alerts]
  );

  const getReportsForUserFn = useCallback(
    (authUser: AuthUser): Report[] => {
      const ids = getVisibleMachineIds(authUser);
      if (ids === null) return reports;
      return reports.filter(r => ids.includes(r.machineId));
    },
    [reports]
  );

  // ── Lookup helpers ──
  const getMachineNameFn = useCallback(
    (machineId: string): string => {
      const m = machines.find(x => x.id === machineId);
      return m ? m.name : machineId;
    },
    [machines]
  );

  const getProductNameFn = useCallback(
    (productId: string): string => {
      const p = products.find(x => x.id === productId);
      return p ? p.name : productId;
    },
    [products]
  );

  // ── Machine CRUD ──
  const addMachine = useCallback((machine: Machine) => {
    const { name, location, lat, lng, ownerId, status, capacity, lastRefill } = machine;
    api.post<any>('/machines', { name, location, lat, lng, ownerId, status, capacity, lastRefill })
      .then(created => setMachines(prev => [...prev, mapMachine(created)]))
      .catch(err => console.error('[DataContext] addMachine:', err));
  }, []);

  const updateMachine = useCallback((id: string, updates: Partial<Machine>) => {
    // Optimistic local update for immediate UI response
    setMachines(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
    api.patch<any>(`/machines/${id}`, updates)
      .then(updated => setMachines(prev => prev.map(m => (m.id === id ? mapMachine(updated) : m))))
      .catch(err => console.error('[DataContext] updateMachine:', err));
  }, []);

  const deleteMachine = useCallback((id: string) => {
    setMachines(prev => prev.filter(m => m.id !== id));
    setProducts(prev => prev.filter(p => p.machineId !== id));
    api.delete<any>(`/machines/${id}`)
      .catch(err => console.error('[DataContext] deleteMachine:', err));
  }, []);

  // ── Product CRUD ──
  const addProduct = useCallback((product: Product) => {
    const { machineId, slotNumber, name, price, cost, weight, stock, imageUrl } = product;
    api.post<any>(`/machines/${machineId}/products`, { slotNumber, name, price, cost, weight, stock, imageUrl })
      .then(created => setProducts(prev => [...prev, mapProduct(created)]))
      .catch(err => console.error('[DataContext] addProduct:', err));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    api.patch<any>(`/products/${id}`, updates)
      .then(updated => setProducts(prev => prev.map(p => (p.id === id ? mapProduct(updated) : p))))
      .catch(err => console.error('[DataContext] updateProduct:', err));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    api.delete<any>(`/products/${id}`)
      .catch(err => console.error('[DataContext] deleteProduct:', err));
  }, []);

  // ── Report mutations ──
  const addReport = useCallback(async (report: Report): Promise<Report> => {
    const { machineId, category, message, name: reporterName, mobileNumber } = report;
    const created = await api.post<any>('/reports', { machineId, category, message, reporterName, reporterMobile: mobileNumber });
    const mapped = mapReport(created);
    setReports(prev => [mapped, ...prev]);
    return mapped;
  }, []);

  const updateReportStatus = useCallback(async (id: string, status: Report['status']): Promise<void> => {
    let previousStatus: Report['status'] | null = null;
    setReports(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        previousStatus = r.status;
        return { ...r, status };
      })
    );

    try {
      await api.patch<any>(`/reports/${id}/status`, { status });
    } catch (err) {
      if (previousStatus) {
        setReports(prev => prev.map(r => (r.id === id ? { ...r, status: previousStatus as Report['status'] } : r)));
      }
      throw err;
    }
  }, []);

  // ── Alert mutations ──
  const updateAlertStatus = useCallback((id: string, status: Alert['status']) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    api.patch<any>(`/alerts/${id}`, { status })
      .catch(err => console.error('[DataContext] updateAlertStatus:', err));
  }, []);

  // ── Sale mutations ──
  // POST /api/sales handles stock decrement + earnings increment atomically.
  // The kiosk's separate decrementStock / updateMachine(earnings) calls are
  // local-only optimistic updates; the DB is always authoritative.
  const addSale = useCallback((sale: Sale) => {
    const body = {
      machineId: sale.machineId,
      items: sale.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    };
    api.post<any>('/sales', body)
      .then(created => {
        setSales(prev => [mapSale(created), ...prev]);
        // Re-fetch machines to get DB-accurate stock + earnings
        api.get<any[]>('/machines')
          .then(raw => {
            setMachines(raw.map(mapMachine));
            setProducts(raw.flatMap((m: any) => (m.products || []).map(mapProduct)));
          })
          .catch(() => { /* non-critical */ });
      })
      .catch(err => console.error('[DataContext] addSale:', err));
  }, []);

  // ── User CRUD ──
  const addUser = useCallback((userRecord: UserRecord) => {
    const { name, email, username, password, role, accessRole, status: userStatus, ownedMachineId } = userRecord;
    api.post<any>('/users', { name, email, username, password, role, accessRole, status: userStatus, ownedMachineId })
      .then(created => setUsers(prev => [...prev, mapUser(created)]))
      .catch(err => console.error('[DataContext] addUser:', err));
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<UserRecord>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    api.patch<any>(`/users/${id}`, updates)
      .then(updated => setUsers(prev => prev.map(u => (u.id === id ? mapUser(updated) : u))))
      .catch(err => console.error('[DataContext] updateUser:', err));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    api.delete<any>(`/users/${id}`)
      .catch(err => console.error('[DataContext] deleteUser:', err));
  }, []);

  // ── Stock management (local-only optimistic update) ──
  // The sale API already decrements stock in the DB; this syncs the UI
  // immediately until the next machines refresh triggered by addSale.
  const decrementStock = useCallback((productId: string, quantity: number) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p
      )
    );
  }, []);

  const value: DataContextType = useMemo(
    () => ({
      machines,
      products,
      sales,
      alerts,
      users,
      reports,
      isLoading,
      enrichedMachines,
      getMachinesForUser: getMachinesForUserFn,
      getProductsForMachine: getProductsForMachineFn,
      getSalesForUser: getSalesForUserFn,
      getAlertsForUser: getAlertsForUserFn,
      getReportsForUser: getReportsForUserFn,
      getMachineName: getMachineNameFn,
      getProductName: getProductNameFn,
      addMachine,
      updateMachine,
      deleteMachine,
      addProduct,
      updateProduct,
      deleteProduct,
      addReport,
      updateReportStatus,
      updateAlertStatus,
      addSale,
      addUser,
      updateUser,
      deleteUser,
      decrementStock,
      refreshData,
    }),
    [
      machines, products, sales, alerts, users, reports, isLoading, enrichedMachines,
      getMachinesForUserFn, getProductsForMachineFn, getSalesForUserFn,
      getAlertsForUserFn, getReportsForUserFn, getMachineNameFn, getProductNameFn,
      addMachine, updateMachine, deleteMachine,
      addProduct, updateProduct, deleteProduct,
      addReport, updateReportStatus, updateAlertStatus,
      addSale, addUser, updateUser, deleteUser, decrementStock, refreshData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────

const noopVoid = () => {};
const noopAsyncReport = async (_report: Report): Promise<Report> => _report;
const noopAsyncVoid = async () => {};
const emptyArr: any[] = [];

/** Safe fallback for when DataProvider hasn't mounted yet (e.g. HMR / preview). */
const FALLBACK: DataContextType = {
  machines: emptyArr,
  products: emptyArr,
  sales: emptyArr,
  alerts: emptyArr,
  users: emptyArr,
  reports: emptyArr,
  isLoading: false,
  enrichedMachines: emptyArr,
  getMachinesForUser: () => emptyArr,
  getProductsForMachine: () => emptyArr,
  getSalesForUser: () => emptyArr,
  getAlertsForUser: () => emptyArr,
  getReportsForUser: () => emptyArr,
  getMachineName: (id: string) => id,
  getProductName: (id: string) => id,
  addMachine: noopVoid,
  updateMachine: noopVoid,
  deleteMachine: noopVoid,
  addProduct: noopVoid,
  updateProduct: noopVoid,
  deleteProduct: noopVoid,
  addReport: noopAsyncReport,
  updateReportStatus: noopAsyncVoid,
  updateAlertStatus: noopVoid,
  addSale: noopVoid,
  addUser: noopVoid,
  updateUser: noopVoid,
  deleteUser: noopVoid,
  decrementStock: noopVoid,
  refreshData: noopVoid,
};

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) {
    // Return safe defaults during HMR / preview instead of crashing
    return FALLBACK;
  }
  return ctx;
}