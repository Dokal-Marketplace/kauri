// convex/seedBranch.ts — dev-only: seed mock data into an EXISTING branch so the
// signed-in manager actually sees it (seed.ts creates its own org/branches).
// Usage: npx convex run seedBranch:seedBranchData '{"branchId":"<id>"}'
import { mutation } from './_generated/server'
import { v } from 'convex/values'

const AGENTS = [
  { fullName: 'Seydou Compaoré', phoneNumber: '+22670223344' },
  { fullName: 'Fatoumata Kaboré', phoneNumber: '+22670334455' },
  { fullName: 'Issa Zongo', phoneNumber: '+22670445566' },
]

const CUSTOMERS = [
  'Awa Sawadogo',
  'Moussa Traoré',
  'Salimata Ouattara',
  'Boureima Nikiéma',
  'Mariam Sanogo',
  'Adama Kafando',
  'Rasmata Ilboudo',
  'Karim Ouédraogo',
  'Alizèta Zoungrana',
  'Drissa Koné',
  'Balkissa Tapsoba',
  'Hamidou Sana',
]

// Product codes must match GOAL_CATEGORIES' productCode so goals resolve to
// real products; branchCodes must include the seeded branch's code.
const PRODUCTS = [
  {
    code: 'EP-SCOL',
    name: 'Épargne Scolarité',
    family: 'epargne',
    summary: 'Épargne dédiée aux frais de scolarité, déblocable à la rentrée.',
    rate: 3.5,
    durationMin: 6,
    durationMax: 12,
    minDeposit: 500,
    maxBalance: 500000,
    fees: 0,
    feesUnit: 'FCFA',
    kycLevel: 'Allégée',
    targetSegments: ['Parents', 'Commerçants'],
  },
  {
    code: 'EP-COM',
    name: 'Épargne Commerce',
    family: 'epargne',
    summary: 'Fonds de roulement pour les petits commerçants, dépôts quotidiens.',
    rate: 4,
    durationMin: 3,
    durationMax: 24,
    minDeposit: 1000,
    maxBalance: 2000000,
    fees: 1,
    feesUnit: '%',
    kycLevel: 'Standard',
    targetSegments: ['Commerçants', 'Artisans'],
  },
  {
    code: 'EP-HAB',
    name: 'Épargne Habitat',
    family: 'epargne',
    summary: 'Constitution d’apport pour la construction ou la rénovation.',
    rate: 4.5,
    durationMin: 12,
    durationMax: 60,
    minDeposit: 5000,
    maxBalance: 10000000,
    fees: 0,
    feesUnit: 'FCFA',
    kycLevel: 'Renforcée',
    targetSegments: ['Salariés', 'Fonctionnaires'],
  },
  {
    code: 'TON-STD',
    name: 'Tontine Standard',
    family: 'tontine',
    summary: 'Tontine rotative hebdomadaire gérée par l’agent de terrain.',
    rate: 0,
    durationMin: 1,
    durationMax: 12,
    minDeposit: 500,
    maxBalance: 300000,
    fees: 100,
    feesUnit: 'FCFA',
    kycLevel: 'Allégée',
    targetSegments: ['Groupements', 'Marchés'],
  },
  {
    code: 'EP-URG',
    name: 'Épargne Urgences',
    family: 'epargne',
    summary: 'Réserve de précaution disponible à tout moment, sans pénalité.',
    rate: 2,
    durationMin: 1,
    durationMax: 36,
    minDeposit: 500,
    maxBalance: 1000000,
    fees: 0,
    feesUnit: 'FCFA',
    kycLevel: 'Allégée',
    targetSegments: ['Tous segments'],
  },
  {
    code: 'CR-MICRO',
    name: 'Microcrédit Express',
    family: 'credit',
    summary: 'Crédit court terme adossé à l’historique d’épargne du client.',
    rate: 12,
    durationMin: 1,
    durationMax: 6,
    minDeposit: 0,
    maxBalance: 500000,
    fees: 2,
    feesUnit: '%',
    kycLevel: 'Renforcée',
    targetSegments: ['Épargnants réguliers'],
  },
] as const

const GOAL_CATEGORIES = [
  { category: 'Scolarité', productCode: 'EP-SCOL' },
  { category: 'Commerce', productCode: 'EP-COM' },
  { category: 'Habitat', productCode: 'EP-HAB' },
  { category: 'Tontine', productCode: 'TON-STD' },
  { category: 'Urgences', productCode: 'EP-URG' },
]

const DAY = 24 * 60 * 60 * 1000

// Additive: seeds the org's product catalogue (skips codes that already exist).
// Run separately so an already-seeded branch can pick up products.
export const seedProducts = mutation({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branchId)
    if (!branch) throw new Error('Branch not found')

    const existing = await ctx.db
      .query('products')
      .withIndex('by_org', (q) => q.eq('organizationId', branch.organizationId))
      .collect()
    const existingCodes = new Set(existing.map((p) => p.code))

    let created = 0
    for (const [i, p] of PRODUCTS.entries()) {
      if (existingCodes.has(p.code)) continue
      await ctx.db.insert('products', {
        organizationId: branch.organizationId,
        code: p.code,
        name: p.name,
        family: p.family,
        summary: p.summary,
        status: i === PRODUCTS.length - 1 ? 'brouillon' : 'actif',
        rate: p.rate,
        durationMin: p.durationMin,
        durationMax: p.durationMax,
        minDeposit: p.minDeposit,
        maxBalance: p.maxBalance,
        fees: p.fees,
        feesUnit: p.feesUnit,
        graceDays: p.family === 'credit' ? 15 : 0,
        kycLevel: p.kycLevel,
        targetSegments: [...p.targetSegments],
        branchCodes: [branch.code],
      })
      created++
    }
    return { created, skipped: PRODUCTS.length - created }
  },
})

export const seedBranchData = mutation({
  args: { branchId: v.id('branches'), force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branchId)
    if (!branch) throw new Error('Branch not found')

    if (!args.force) {
      const existing = await ctx.db
        .query('customers')
        .withIndex('by_branch', (q) => q.eq('branchId', args.branchId))
        .first()
      if (existing) {
        throw new Error('Branch already has customers — pass {"force": true} to seed anyway')
      }
    }

    const now = Date.now()
    // Deterministic-enough pseudo-random (mutations may not need it, but keeps
    // amounts varied without Math.random-seeding concerns)
    let rngState = 42
    const rng = () => {
      rngState = (rngState * 1103515245 + 12345) % 2147483648
      return rngState / 2147483648
    }
    const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)]

    // ── Agents ───────────────────────────────────────────────────────────────
    const agentIds = []
    for (const [i, a] of AGENTS.entries()) {
      agentIds.push(
        await ctx.db.insert('users', {
          fullName: a.fullName,
          email: `${a.fullName.split(' ')[0].toLowerCase()}.demo@kauri.bf`,
          phoneNumber: a.phoneNumber,
          tokenIdentifier: `seed|agent_${args.branchId}_${i}`,
          branchId: args.branchId,
          status: 'active',
        })
      )
    }

    // ── Devices (TPE) ────────────────────────────────────────────────────────
    const deviceIds = []
    for (let i = 0; i < 5; i++) {
      deviceIds.push(
        await ctx.db.insert('devices', {
          serialNumber: `TPE-${branch.code.replace(/\s+/g, '')}-${1001 + i}`,
          model: pick(['Sunmi V2 Pro', 'PAX A920', 'Nexgo N5']),
          brand: pick(['Sunmi', 'PAX', 'Nexgo']),
          branchId: args.branchId,
          assignedTo: i < agentIds.length ? agentIds[i] : undefined,
          status: i === 4 ? 'maintenance' : 'active',
          lastSync: now - Math.floor(rng() * 6) * 60 * 60 * 1000,
          batteryPct: 20 + Math.floor(rng() * 80),
          signalLevel: 2 + Math.floor(rng() * 4),
          queuedCount: i === 1 ? 3 : 0,
          registrationDate: now - 60 * DAY,
        })
      )
    }

    // ── Customers ────────────────────────────────────────────────────────────
    const customerIds = []
    for (const [i, name] of CUSTOMERS.entries()) {
      customerIds.push(
        await ctx.db.insert('customers', {
          fullName: name,
          phoneNumber: `+2267${(6000000 + i * 13579).toString().padStart(7, '0')}`,
          idNumber: `B${(100000 + i * 777).toString()}`,
          organizationId: branch.organizationId,
          branchId: args.branchId,
          onboardedBy: agentIds[i % agentIds.length],
          status: i < 10 ? 'verified' : 'prospect',
          createdAt: now - (90 - i * 6) * DAY,
          balance: 0,
        })
      )
    }

    // ── Transactions (last 35 days) ──────────────────────────────────────────
    const balances = new Map(customerIds.map((id) => [id, 0]))
    let txCount = 0
    for (let day = 34; day >= 0; day--) {
      const perDay = 1 + Math.floor(rng() * 4)
      for (let k = 0; k < perDay; k++) {
        const customerId = pick(customerIds.slice(0, 10)) // verified only
        const agentIdx = Math.floor(rng() * agentIds.length)
        const isDeposit = rng() < 0.72
        const balance = balances.get(customerId) ?? 0
        const amount = isDeposit
          ? (1 + Math.floor(rng() * 40)) * 500
          : Math.max(500, Math.floor((balance * rng()) / 500) * 500)
        if (!isDeposit && balance < amount) continue
        balances.set(customerId, balance + (isDeposit ? amount : -amount))
        await ctx.db.insert('transactions', {
          amount,
          currency: 'XOF',
          customerId,
          agentId: agentIds[agentIdx],
          branchId: args.branchId,
          tpeId: `TPE-${branch.code.replace(/\s+/g, '')}-${1001 + (agentIdx % 5)}`,
          type: isDeposit ? 'deposit' : 'withdrawal',
          status: day === 0 && k === 0 ? 'pending' : 'completed',
          timestamp: now - day * DAY - Math.floor(rng() * 10 * 60 * 60 * 1000),
        })
        txCount++
      }
    }
    for (const [id, balance] of balances) {
      await ctx.db.patch(id, { balance })
    }

    // ── Savings goals ────────────────────────────────────────────────────────
    for (const [i, g] of GOAL_CATEGORIES.entries()) {
      await ctx.db.insert('savingsGoals', {
        customerId: customerIds[i],
        branchId: args.branchId,
        agentId: agentIds[i % agentIds.length],
        category: g.category,
        productCode: g.productCode,
        targetAmount: (20 + Math.floor(rng() * 80)) * 5000,
        deadline: new Date(now + (60 + i * 30) * DAY).toISOString().split('T')[0],
        status: (['encours', 'encours', 'atteint', 'enretard', 'encours'] as const)[i],
        createdAt: now - (40 - i * 5) * DAY,
      })
    }

    // ── Disbursements ────────────────────────────────────────────────────────
    const caller = await ctx.db
      .query('users')
      .withIndex('by_branch', (q) => q.eq('branchId', args.branchId))
      .first()
    const approver = caller?._id ?? agentIds[0]
    const disbStatuses = ['pending', 'approved', 'executed', 'rejected'] as const
    for (const [i, status] of disbStatuses.entries()) {
      await ctx.db.insert('disbursements', {
        amount: (10 + Math.floor(rng() * 50)) * 1000,
        customerId: customerIds[i],
        branchId: args.branchId,
        initiatedBy: agentIds[i % agentIds.length],
        approvedBy: status === 'approved' || status === 'executed' ? approver : undefined,
        status,
        timestamp: now - (i + 1) * 2 * DAY,
        payoutMethod: i % 2 === 0 ? 'cash' : 'mobile_money',
        rejectionReason: status === 'rejected' ? 'Solde insuffisant' : undefined,
        rejectedBy: status === 'rejected' ? approver : undefined,
      })
    }

    // Products live in the separate additive seedProducts mutation (org-scoped,
    // skips existing codes) — run both when seeding a fresh branch.

    // ── Reconciliations ──────────────────────────────────────────────────────
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now - i * DAY).toISOString().split('T')[0]
      const expected = (50 + Math.floor(rng() * 100)) * 1000
      const variance = i === 2 ? -2500 : 0
      await ctx.db.insert('reconciliations', {
        agentId: agentIds[i % agentIds.length],
        branchId: args.branchId,
        verifiedBy: approver,
        date,
        systemExpectedAmount: expected,
        physicalCashReceived: expected + variance,
        variance,
        status: variance === 0 ? 'settled' : 'discrepancy',
        timestamp: now - i * DAY + 18 * 60 * 60 * 1000,
      })
    }

    return {
      agents: agentIds.length,
      devices: deviceIds.length,
      customers: customerIds.length,
      transactions: txCount,
      goals: GOAL_CATEGORIES.length,
      disbursements: disbStatuses.length,
      reconciliations: 3,
    }
  },
})
