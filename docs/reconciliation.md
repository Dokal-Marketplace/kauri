// 3. The Reconciliation WorkflowA clean EOD process usually follows these three steps to minimize "mysterious" cash losses:Step A: The Agent's Pre-Check (TPE Side)Before heading to the branch, 
// the agent runs a "Daily Summary" on the TPE.The TPE displays: "Total Collected: 450,000 CFA".The agent counts their physical cash. If it's 450,000 CFA, they proceed. If it's 445,000 CFA, 
// they know they have a problem before talking to the accountant.Step B: The Physical HandoverAt the branch, the Accountant uses the settleDailyCash mutation.Case 1: $Variance = 0$. Perfect. 
// The session is closed.Case 2: $Variance < 0$ (Shortfall). The agent is "short." The system flags a discrepancy. 
// This usually triggers an internal HR process or a deduction from the agent's 
// next commission.Case 3: $Variance > 0$ (Overage). Rare, but usually indicates an agent forgot to record a transaction or gave a customer the wrong change.Step C: Locking the TransactionsOnce a reconciliation is settled, 
// your transactions table should ideally become "read-only" for that date.Implementation Tip: In your reverseTransaction mutation, add a check:If a reconciliation record exists for this agent on this date and is 'settled', block the reversal. 
// This prevents agents and supervisors from colluding to reverse transactions after the cash has already been accounted for.4. Why Use Math for Variances?Using a simple formula 
// ensures the Accountant doesn't have to do mental math (where errors happen):$$Variance = V_{physical} - \sum V_{system}$$By storing the $Variance$ as a signed integer, 
// you can run a monthly report to see which agents are consistently "short," which is a leading indicator of either poor training or potential fraud.Are you planning to generate a PDF or thermal receipt for the agent to keep as proof 
// that they "dropped" the cash successfully?