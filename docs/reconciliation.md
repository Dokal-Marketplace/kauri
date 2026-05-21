## 3. The Reconciliation Workflow

A clean end-of-day (EOD) process usually follows these three steps to minimize "mysterious" cash losses.

### Step A: The Agent's Pre-Check (TPE Side)
Before heading to the branch, the agent runs a **Daily Summary** on the TPE.

Example:
- TPE shows: **Total Collected: 450,000 CFA**
- Agent counts physical cash:
  - If it is **450,000 CFA**, proceed.
  - If it is **445,000 CFA**, a discrepancy exists before handover.

### Step B: The Physical Handover
At the branch, the accountant uses the `settleDailyCash` mutation.

Cases:
1. **Variance = 0**: Perfect; close the session.
2. **Variance < 0 (Shortfall)**: Agent is short; flag discrepancy. This may trigger HR process or commission deduction.
3. **Variance > 0 (Overage)**: Rare; may indicate missed transaction entry or incorrect change.

### Step C: Locking Transactions After Settlement
Once reconciliation is settled, transactions for that date should become read-only.

Implementation tip in `reverseTransaction`:
- If a reconciliation record exists for the same agent/date and status is `settled`, block reversal.

This prevents post-settlement reversals/collusion after cash has been accounted for.

## 4. Why Use Math for Variances?

Use a simple formula to avoid manual calculation errors:

$$
\text{Variance} = V_{\text{physical}} - \sum V_{\text{system}}
$$

Store `Variance` as a signed integer so monthly reports can identify repeated shortfalls (training or fraud risk indicators).

Consider generating a PDF or thermal receipt as proof that the agent successfully dropped cash.