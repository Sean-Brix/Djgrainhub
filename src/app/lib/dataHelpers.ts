/**
 * Data Helpers for DJ Grain Hub
 *
 * Exports types and pure utility functions.
 * All mutable data operations are in DataContext.tsx.
 * The static imports below are kept ONLY for backward-compat
 * helpers (getMachineStockLevel, etc.) that are used as pure functions.
 */

import type { AuthUser } from './auth';

// ─── Types ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  machineId: string;
  slotNumber: number; // 1-6
  name: string;
  price: number; // Selling price per piece
  cost: number; // Cost/purchase price per piece
  weight: number; // Weight of a single piece in KG
  stock: number; // Current stock in pieces
  imageUrl: string; // Photo link
}

export interface Machine {
  id: string;
  name: string;
  location: string;
  lat?: number;
  lng?: number;
  ownerId: string;
  status: 'online' | 'warning' | 'offline';
  capacity: number; // This is machine capacity (total slots or units)
  lastRefill: string;
  earnings: number;
  alerts: number;
  products?: Product[];
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  machineId: string;
  items: SaleItem[];
  totalPrice: number;
  timestamp: string;
  status: 'completed' | 'failed';
}

export interface Alert {
  id: string;
  machineId: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  status: 'active' | 'resolved';
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  accessRole: 'super_admin' | 'admin';
  status: string;
  ownedMachineId: string;
}

export interface Report {
  id: string;
  machineId: string;
  category: string;
  message: string;
  name: string;
  mobileNumber: string;
  timestamp: string;
  status: 'open' | 'resolved';
}

// ─── Computed helpers (pure functions, no data dependency) ─────────────

/** Calculate overall stock level percentage for a machine */
export function getMachineStockLevel(machine: Machine): number {
  const products = machine.products || [];
  if (!products || products.length === 0) return 0;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalTheoreticalCapacity = machine.capacity || (products.length * 20);
  return Math.min(100, Math.round((totalStock / totalTheoreticalCapacity) * 100));
}

/** Get total weight in kg for a machine's current stock */
export function getMachineTotalStockKg(machine: Machine): number {
  const products = machine.products || [];
  return products.reduce((sum, p) => sum + (p.stock * p.weight), 0);
}

/** Get total piece count for a machine */
export function getMachineTotalStockPcs(machine: Machine): number {
  const products = machine.products || [];
  return products.reduce((sum, p) => sum + p.stock, 0);
}

/** Get all unique product names across given machines */
export function getUniqueProducts(machines: Machine[]): string[] {
  const productSet = new Set<string>();
  machines.forEach(m => {
    const products = m.products || [];
    products.forEach(p => productSet.add(p.name));
  });
  return Array.from(productSet).sort();
}

/** Calculate a health score (0-100) for a machine based on status, alerts and stock */
export function getMachineHealthScore(machine: Machine, activeAlertsCount: number = 0): number {
  let score = 100;
  
  // Status penalties
  if (machine.status === 'offline') score -= 50;
  else if (machine.status === 'warning') score -= 20;
  
  // Alert penalties
  score -= activeAlertsCount * 15;
  
  // Stock penalties (low stock affects "health" or operational readiness)
  const stockLevel = getMachineStockLevel(machine);
  if (stockLevel < 10) score -= 30;
  else if (stockLevel < 25) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}
