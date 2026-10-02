# Quantum Nexus — optional Qiskit service

**You do not need this to use Quantum Nexus.** The web app runs every circuit in
its own browser simulator. This small service lets the *same* circuits be run by
**Qiskit Aer** instead, through the app's execution abstraction layer
(`lib/execution.ts`). If the service is stopped or unreachable, the app falls
back to the browser simulator and tells the learner it did so.

It needs no API keys and stores nothing.

## What you need

- Python 3.10 or newer (`python --version` to check)

## Start it

**WHERE:** a terminal, inside the `backend` folder of the project.

**WHAT** (macOS / Linux):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

**WHAT** (Windows PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --port 8000
```

**WHAT IT DOES:** creates a private Python environment, installs FastAPI and
Qiskit into it, and starts the service on port 8000.

**WHAT YOU SHOULD SEE:** a line ending in `Uvicorn running on http://127.0.0.1:8000`.
Open <http://localhost:8000/api/health> in a browser and you should see
`"quantum_simulator": "online"`.

**IF IT FAILS:**

- `python: command not found` → try `python3` instead of `python`.
- `pip install` fails on `qiskit-aer` → upgrade pip (`pip install --upgrade pip`)
  and try again. If it still fails, remove the `qiskit-aer` line from
  `requirements.txt`; the service then uses Qiskit's built-in simulator and its
  health check says so.
- `Address already in use` → another program is using port 8000. Use
  `--port 8001` and use that number in the next step as well.

## Connect the web app to it

**WHERE:** the project's top folder (the one with `package.json`).

**WHAT:** create a file named `.env.local` containing one line:

```
NEXT_PUBLIC_QISKIT_API_URL=http://localhost:8000
```

Then stop `npm run dev` (Ctrl + C) and start it again.

**WHAT IT DOES:** tells the web app where the service is.

**WHAT YOU SHOULD SEE:** in the app, open **Settings**. Under *Where circuits
run*, "Qiskit Aer service" can now be selected, and *System status* shows it as
Online. Run any circuit: the result says it ran on the Qiskit Aer service, and
the *Circuit* tab shows Qiskit's own drawing of your circuit.

**IF IT FAILS:** Settings shows "Configured, but it did not answer" → the service
is not running, or the port number in `.env.local` does not match.

## API

| Method | Path            | What it does                                              |
| ------ | --------------- | --------------------------------------------------------- |
| GET    | `/api/health`   | Builds and runs a Bell pair; reports whether it worked    |
| POST   | `/api/simulate` | Validates and runs a circuit; returns counts and a diagram |

Request for `/api/simulate`:

```json
{
  "qubits": 2,
  "shots": 1024,
  "gates": [
    { "type": "H", "qubit": 0, "step": 0 },
    { "type": "CX", "qubit": 0, "target": 1, "step": 1 },
    { "type": "M", "qubit": 0, "step": 2 },
    { "type": "M", "qubit": 1, "step": 2 }
  ]
}
```

Success:

```json
{ "success": true, "data": { "counts": { "00": 507, "11": 517 }, "shots": 1024, "measured": [0, 1], "backend": "qiskit", "engine": "qiskit 2.x / aer 0.17.x", "diagram": "…" } }
```

Error (always this shape, never a stack trace):

```json
{ "success": false, "error": { "code": "NO_MEASUREMENT", "message": "Nothing is being measured, so there is no result to observe." } }
```

Result keys are written the Quantum Nexus way: the lowest measured qubit is on
the **left** (Qiskit itself prints it on the right; the service reverses it).

Limits: 1–5 qubits, 1–8,192 shots, up to 200 gates.
Gates: `H X Y Z S T RX RY RZ CX CZ SWAP CCX M`.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

## Deploying it

Vercel hosts the web app, not this Python service. To use Qiskit on a deployed
site, host this folder on any service that runs Python web apps, set
`ALLOWED_ORIGINS` there to your site's address, and set
`NEXT_PUBLIC_QISKIT_API_URL` in the Vercel project to the service's address.
Without those two settings the deployed site simply uses the browser simulator.

## Database

`database/schema.sql` is the **planned** PostgreSQL + pgvector schema. It is not
used by this build — progress is stored in the learner's browser.
