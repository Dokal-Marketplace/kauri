// Mock data for the Kauri dashboard + clients page

const CLIENTS = [
  { id: 1,  initials: "AK", name: "Awa Konaté",          phone: "+226 70 11 22 33", balance: 85000,  status: "actif",   joined: "2024-08-12", goal: 100000, lastTx: "il y a 2h",   agent: "K. Djibril",  village: "Bobo-Dioulasso", product: "Tontine",  txCount: 24, monthlyAvg: 12000 },
  { id: 2,  initials: "IT", name: "Ibrahim Traoré",       phone: "+226 76 45 67 89", balance: 120500, status: "actif",   joined: "2024-04-03", goal: 150000, lastTx: "il y a 6h",   agent: "K. Djibril",  village: "Bobo-Dioulasso", product: "Carnet",   txCount: 41, monthlyAvg: 18500 },
  { id: 3,  initials: "SO", name: "Salimata Ouédraogo",   phone: "+226 62 33 44 55", balance: 42000,  status: "archive", joined: "2023-11-20", goal: 60000,  lastTx: "il y a 12 j", agent: "A. Ouédraogo", village: "Banfora",        product: "Carnet",   txCount: 18, monthlyAvg: 4200 },
  { id: 4,  initials: "MD", name: "Moussa Diallo",        phone: "+226 71 88 99 00", balance: 210000, status: "actif",   joined: "2024-01-15", goal: 250000, lastTx: "hier",        agent: "K. Djibril",  village: "Bobo-Dioulasso", product: "Plan+",    txCount: 67, monthlyAvg: 24000 },
  { id: 5,  initials: "FZ", name: "Fatoumata Zongo",      phone: "+226 78 12 34 56", balance: 67500,  status: "actif",   joined: "2024-09-02", goal: 80000,  lastTx: "il y a 3h",   agent: "A. Ouédraogo", village: "Hounde",         product: "Tontine",  txCount: 32, monthlyAvg: 9000 },
  { id: 6,  initials: "BS", name: "Boukary Sawadogo",     phone: "+226 65 54 32 11", balance: 18200,  status: "attente", joined: "2026-04-30", goal: 50000,  lastTx: "—",           agent: "K. Djibril",  village: "Bobo-Dioulasso", product: "Carnet",   txCount: 1,  monthlyAvg: 0 },
  { id: 7,  initials: "RK", name: "Rasmata Kaboré",       phone: "+226 70 22 33 44", balance: 156800, status: "actif",   joined: "2023-06-08", goal: 200000, lastTx: "il y a 4h",   agent: "K. Djibril",  village: "Banfora",        product: "Plan+",    txCount: 52, monthlyAvg: 21000 },
  { id: 8,  initials: "AC", name: "Adama Compaoré",       phone: "+226 76 88 21 09", balance: 33400,  status: "actif",   joined: "2025-02-14", goal: 50000,  lastTx: "hier",        agent: "A. Ouédraogo", village: "Bobo-Dioulasso", product: "Tontine",  txCount: 14, monthlyAvg: 5800 }
]

const TRANSACTIONS = [
  { id: 1, type: "in",  client: "Awa Konaté",         label: "Dépôt",      amount: 15000, time: "Aujourd’hui, 10:22", agent: "K. Djibril" },
  { id: 2, type: "out", client: "Ibrahim Traoré",     label: "Retrait",    amount: 30000, time: "Aujourd’hui, 09:05", agent: "K. Djibril" },
  { id: 3, type: "in",  client: "Moussa Diallo",      label: "Dépôt",      amount: 50000, time: "Hier, 16:45",        agent: "A. Ouédraogo" },
  { id: 4, type: "in",  client: "Fatoumata Zongo",    label: "Dépôt",      amount: 12500, time: "Hier, 14:18",        agent: "K. Djibril" },
  { id: 5, type: "out", client: "Salimata Ouédraogo", label: "Retrait",    amount: 8000,  time: "Hier, 11:30",        agent: "A. Ouédraogo" },
  { id: 6, type: "in",  client: "Boukary Sawadogo",   label: "Cotisation", amount: 5000,  time: "29 avr., 17:02",     agent: "K. Djibril" },
];

const CLIENT_TX = {
  // a per-client mini-history for the detail drawer (id -> entries)
  1: [
    { type: "in",  label: "Dépôt",      amount: 15000, time: "Aujourd’hui, 10:22" },
    { type: "in",  label: "Cotisation", amount: 5000,  time: "28 avr., 09:14" },
    { type: "out", label: "Retrait",    amount: 8000,  time: "20 avr., 15:30" },
    { type: "in",  label: "Dépôt",      amount: 12000, time: "12 avr., 11:08" },
    { type: "in",  label: "Dépôt",      amount: 10000, time: "5 avr., 16:45"  },
  ],
};

const VOLUME = [
  { m: "Jan", in: 280, out: 90 },
  { m: "Fév", in: 320, out: 120 },
  { m: "Mar", in: 240, out: 180 },
  { m: "Avr", in: 410, out: 110 },
  { m: "Mai", in: 360, out: 150 },
  { m: "Jun", in: 480, out: 130 },
];

const KPIS = [
  { label: "Clients actifs",  value: "142",        unit: "",     delta: "+8",   dir: "up",   note: "ce mois", icon: "users",   spark: [3,4,4,5,4,6,6,7,8,7,8,9] },
  { label: "Épargne totale",  value: "4 820 000",  unit: "FCFA", delta: "+4,2%", dir: "up",  note: "vs. avr.", icon: "wallet", spark: [4,5,4,6,7,7,8,7,9,10,11,12] },
  { label: "Transactions",    value: "318",        unit: "",     delta: "+12",  dir: "up",   note: "ce mois", icon: "receipt", spark: [6,5,7,6,8,7,9,10,8,11,12,12] },
  { label: "Commissions",     value: "96 400",     unit: "FCFA", delta: "−1,1%", dir: "down", note: "vs. avr.", icon: "coin",   spark: [9,10,10,9,11,12,11,10,9,10,11,10] },
];

const CLIENT_KPIS = [
  { label: "Clients (total)",   value: "184",       unit: "",     delta: "+12",  dir: "up",   note: "ce mois",       icon: "users" },
  { label: "Actifs",            value: "142",       unit: "",     delta: "77%",  dir: "up",   note: "du portefeuille", icon: "users" },
  { label: "Solde moyen",       value: "33 940",    unit: "FCFA", delta: "+2,8%",dir: "up",   note: "vs. avr.",       icon: "wallet" },
  { label: "En attente KYC",    value: "6",         unit: "",     delta: "−2",   dir: "up",   note: "vs. semaine",    icon: "shield" },
];

const FEED = [
  { dot: "brand", text: <><strong>Awa Konaté</strong> a effectué un dépôt de <strong>15 000 FCFA</strong>.</>, time: "Aujourd’hui · 10:22" },
  { dot: "muted", text: <><strong>Ibrahim Traoré</strong> a retiré <strong>30 000 FCFA</strong> en agence.</>, time: "Aujourd’hui · 09:05" },
  { dot: "info",  text: <>Synchronisation hors-ligne — <strong>4 transactions</strong> en attente d’envoi.</>, time: "Aujourd’hui · 08:40" },
  { dot: "brand", text: <><strong>Moussa Diallo</strong> a atteint <strong>84%</strong> de son objectif d’épargne.</>, time: "Hier · 17:30" },
  { dot: "muted", text: <>Nouvel agent ajouté : <strong>Aïssata Ouédraogo</strong>.</>, time: "Hier · 14:02" },
];

const GOALS = [
  { client: "Moussa Diallo",   pct: 84, current: 210000, target: 250000 },
  { client: "Ibrahim Traoré",  pct: 80, current: 120500, target: 150000 },
  { client: "Fatoumata Zongo", pct: 84, current: 67500,  target: 80000  },
  { client: "Awa Konaté",      pct: 85, current: 85000,  target: 100000 },
];

window.KAURI_DATA = { CLIENTS, TRANSACTIONS, VOLUME, KPIS, FEED, GOALS, CLIENT_KPIS, CLIENT_TX };
