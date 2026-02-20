/**
 * DataContext for DJ Grain Hub
 *
 * Centralizes ALL mutable in-memory data into a single React context.
 * Every page reads from and writes to this store, so changes are
 * visible across all pages instantly (within the same session).
 *
 * Initializes from the JSON database files on mount.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import machinesData from '../../db/machines.json';
import productsData from '../../db/products.json';
import salesData from '../../db/sales.json';
import alertsData from '../../db/alerts.json';
import usersData from '../../db/users.json';
import reportsData from '../../db/reports.json';
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

// ─── Raw sale type (matches JSON format) ─────────────────────────────
interface RawSale {
  id: string;
  machineId: string;
  items: [string, number, number][];
  totalPrice: number;
  timestamp: string;
  status: 'completed' | 'failed';
}

// ─── Convert raw sales to UI format ──────────────────────────────────
function convertRawSales(raw: RawSale[]): Sale[] {
  return raw.map(sale => ({
    ...sale,
    items: sale.items.map(([productId, quantity, lineTotal]) => ({
      productId,
      quantity,
      price: quantity > 0 ? lineTotal / quantity : 0,
    })),
  }));
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
  addReport: (report: Report) => void;
  updateReportStatus: (id: string, status: Report['status']) => void;

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ─── Helper: visible machine IDs for a user ──────────────────────────
function getVisibleMachineIds(user: AuthUser): string[] | null {
  if (user.accessRole === 'super_admin') return null; // sees all
  return user.ownedMachineId ? [user.ownedMachineId] : [];
}

// ─── Provider ────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>(() => machinesData as Machine[]);
  const [products, setProducts] = useState<Product[]>(() => productsData as Product[]);
  const [sales, setSales] = useState<Sale[]>(() => convertRawSales(salesData as RawSale[]));
  const [alerts, setAlerts] = useState<Alert[]>(() => alertsData as Alert[]);
  const [users, setUsers] = useState<UserRecord[]>(() => usersData as UserRecord[]);
  const [reports, setReports] = useState<Report[]>(() => reportsData as Report[]);

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
    (user: AuthUser): Machine[] => {
      const ids = getVisibleMachineIds(user);
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
    (user: AuthUser): Sale[] => {
      const ids = getVisibleMachineIds(user);
      if (ids === null) return sales;
      return sales.filter(s => ids.includes(s.machineId));
    },
    [sales]
  );

  const getAlertsForUserFn = useCallback(
    (user: AuthUser): Alert[] => {
      const ids = getVisibleMachineIds(user);
      if (ids === null) return alerts;
      return alerts.filter(a => ids.includes(a.machineId));
    },
    [alerts]
  );

  const getReportsForUserFn = useCallback(
    (user: AuthUser): Report[] => {
      const ids = getVisibleMachineIds(user);
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
    setMachines(prev => [...prev, machine]);
  }, []);

  const updateMachine = useCallback((id: string, updates: Partial<Machine>) => {
    setMachines(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const deleteMachine = useCallback((id: string) => {
    setMachines(prev => prev.filter(m => m.id !== id));
    // Also remove associated products
    setProducts(prev => prev.filter(p => p.machineId !== id));
  }, []);

  // ── Product CRUD ──
  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [...prev, product]);
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Report mutations ──
  const addReport = useCallback((report: Report) => {
    setReports(prev => [report, ...prev]);
  }, []);

  const updateReportStatus = useCallback((id: string, status: Report['status']) => {
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
  }, []);

  // ── Alert mutations ──
  const updateAlertStatus = useCallback((id: string, status: Alert['status']) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
  }, []);

  // ── Sale mutations ──
  const addSale = useCallback((sale: Sale) => {
    setSales(prev => [...prev, sale]);
  }, []);

  // ── User CRUD ──
  const addUser = useCallback((user: UserRecord) => {
    setUsers(prev => [...prev, user]);
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<UserRecord>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // ── Stock management ──
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
    }),
    [
      machines, products, sales, alerts, users, reports, enrichedMachines,
      getMachinesForUserFn, getProductsForMachineFn, getSalesForUserFn,
      getAlertsForUserFn, getReportsForUserFn, getMachineNameFn, getProductNameFn,
      addMachine, updateMachine, deleteMachine,
      addProduct, updateProduct, deleteProduct,
      addReport, updateReportStatus, updateAlertStatus,
      addSale, addUser, updateUser, deleteUser, decrementStock,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────

const noopVoid = () => {};
const emptyArr: any[] = [];

/** Safe fallback for when DataProvider hasn't mounted yet (e.g. HMR / preview). */
const FALLBACK: DataContextType = {
  machines: emptyArr,
  products: emptyArr,
  sales: emptyArr,
  alerts: emptyArr,
  users: emptyArr,
  reports: emptyArr,
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
  addReport: noopVoid,
  updateReportStatus: noopVoid,
  updateAlertStatus: noopVoid,
  addSale: noopVoid,
  addUser: noopVoid,
  updateUser: noopVoid,
  deleteUser: noopVoid,
  decrementStock: noopVoid,
};

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) {
    // Return safe defaults during HMR / preview instead of crashing
    return FALLBACK;
  }
  return ctx;
}