"""
Quantum Nexus — optional Qiskit execution service.

The web app runs every circuit in its own browser simulator, so this service
is NOT required. Start it when you want the same circuits to be executed by
Qiskit Aer instead; the app then sends each circuit here through its
execution abstraction layer (lib/execution.ts).

Endpoints
    GET  /api/health     real health check (builds and runs a test circuit)
    POST /api/simulate   run a circuit, return counts

Every response has one of two shapes:
    {"success": true,  "data": {...}}
    {"success": false, "error": {"code": "...", "message": "..."}}

No secrets are needed and nothing is stored: a request is validated, run and
forgotten.
"""

from __future__ import annotations

import math
import os
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

# ---------------------------------------------------------------------------
# Limits — the same ones the browser simulator enforces
# ---------------------------------------------------------------------------

MAX_QUBITS = 5
MAX_SHOTS = 8192
MAX_GATES = 200

SINGLE = {"H", "X", "Y", "Z", "S", "T"}
ROTATION = {"RX", "RY", "RZ"}
TWO_QUBIT = {"CX", "CZ", "SWAP"}
GATE_TYPES = SINGLE | ROTATION | TWO_QUBIT | {"CCX", "M"}

# ---------------------------------------------------------------------------
# Qiskit is imported defensively, so a missing package becomes an honest
# "unavailable" in the health check instead of a crash at start-up.
# ---------------------------------------------------------------------------

ENGINE = "unavailable"
_backend: Any = None
_import_error = ""

try:
    import qiskit
    from qiskit import QuantumCircuit, transpile

    try:
        import qiskit_aer
        from qiskit_aer import AerSimulator

        _backend = AerSimulator()
        ENGINE = f"qiskit {qiskit.__version__} / aer {qiskit_aer.__version__}"
    except Exception:  # Aer missing: fall back to Qiskit's built-in simulator
        from qiskit.providers.basic_provider import BasicSimulator

        _backend = BasicSimulator()
        ENGINE = f"qiskit {qiskit.__version__} / BasicSimulator (Aer not installed)"
except Exception as error:  # Qiskit itself is missing
    _import_error = type(error).__name__


class ApiError(Exception):
    """An error that is safe to show to the learner."""

    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def failure(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"success": False, "error": {"code": code, "message": message}})


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------


class Gate(BaseModel):
    type: str = Field(max_length=8)
    qubit: int
    step: int = Field(ge=0, le=10_000)
    target: int | None = None
    control2: int | None = None
    theta: float | None = None


class SimulateRequest(BaseModel):
    qubits: int
    shots: int
    gates: list[Gate] = Field(max_length=MAX_GATES)


def wires_of(gate: Gate) -> list[int | None]:
    if gate.type in TWO_QUBIT:
        return [gate.qubit, gate.target]
    if gate.type == "CCX":
        return [gate.qubit, gate.control2, gate.target]
    return [gate.qubit]


def validate(request: SimulateRequest) -> list[int]:
    """Check the circuit. Returns the measured qubits, lowest first."""
    if not 1 <= request.qubits <= MAX_QUBITS:
        raise ApiError(400, "INVALID_REQUEST", f"This simulator runs 1 to {MAX_QUBITS} qubits.")
    if not 1 <= request.shots <= MAX_SHOTS:
        raise ApiError(400, "INVALID_REQUEST", f"Shots must be a whole number from 1 to {MAX_SHOTS}.")
    if not request.gates:
        raise ApiError(400, "EMPTY", "This circuit has no gates yet.")

    measured_at: dict[int, int] = {}
    for gate in request.gates:
        if gate.type not in GATE_TYPES:
            raise ApiError(400, "INVALID_REQUEST", f'"{gate.type}" is not a gate this simulator knows.')
        wires = wires_of(gate)
        if any(w is None or not 0 <= w < request.qubits for w in wires):
            raise ApiError(400, "INVALID_REQUEST", f"A {gate.type} gate points at a qubit that does not exist.")
        if len(set(wires)) != len(wires):
            raise ApiError(400, "INVALID_CX", f"A {gate.type} gate needs different qubits.")
        if gate.type in ROTATION and gate.theta is not None and not math.isfinite(gate.theta):
            raise ApiError(400, "INVALID_REQUEST", f"The angle of a {gate.type} gate is not a number.")
        if gate.type == "M":
            measured_at[gate.qubit] = min(measured_at.get(gate.qubit, gate.step), gate.step)

    for gate in request.gates:
        for wire in wires_of(gate):
            if wire in measured_at and gate.step > measured_at[wire]:
                raise ApiError(400, "GATE_AFTER_MEASUREMENT", f"q{wire} has a gate after its measurement.")
    if not measured_at:
        raise ApiError(400, "NO_MEASUREMENT", "Nothing is being measured, so there is no result to observe.")
    return sorted(measured_at)


# ---------------------------------------------------------------------------
# Building and running
# ---------------------------------------------------------------------------


def build_circuit(request: SimulateRequest, measured: list[int]) -> "QuantumCircuit":
    circuit = QuantumCircuit(request.qubits, len(measured))
    for gate in sorted(request.gates, key=lambda g: (g.step, g.qubit)):
        kind, q = gate.type, gate.qubit
        if kind == "M":
            continue
        if kind in SINGLE:
            getattr(circuit, kind.lower())(q)
        elif kind in ROTATION:
            getattr(circuit, kind.lower())(gate.theta if gate.theta is not None else math.pi / 2, q)
        elif kind == "CX":
            circuit.cx(q, gate.target)
        elif kind == "CZ":
            circuit.cz(q, gate.target)
        elif kind == "SWAP":
            circuit.swap(q, gate.target)
        elif kind == "CCX":
            circuit.ccx(q, gate.control2, gate.target)
    for bit, qubit in enumerate(measured):
        circuit.measure(qubit, bit)
    return circuit


def run_circuit(circuit: "QuantumCircuit", shots: int) -> dict[str, int]:
    """Run on the simulator. Keys come back in Quantum Nexus order: lowest measured qubit on the LEFT."""
    job = _backend.run(transpile(circuit, _backend), shots=shots)
    raw = job.result().get_counts()
    # Qiskit writes the LAST classical bit on the left, so each key is reversed.
    return {key.replace(" ", "")[::-1]: int(value) for key, value in raw.items()}


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Quantum Nexus Qiskit service", version="1.0.0", docs_url="/api/docs", redoc_url=None)

# Only the origins you list may call this service from a browser.
allowed_origins = [
    origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(ApiError)
async def handle_api_error(_: Request, error: ApiError) -> JSONResponse:
    return failure(error.status, error.code, error.message)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
    return failure(422, "INVALID_REQUEST", "The request is not a valid circuit.")


@app.exception_handler(StarletteHTTPException)
async def handle_http_error(_: Request, error: StarletteHTTPException) -> JSONResponse:
    code = "NOT_FOUND" if error.status_code == 404 else "REQUEST_FAILED"
    return failure(error.status_code, code, "This address is not part of the service." if error.status_code == 404 else "The request could not be handled.")


@app.exception_handler(Exception)
async def handle_unexpected(_: Request, __: Exception) -> JSONResponse:
    # Never leak a stack trace to the browser.
    return failure(500, "INTERNAL_ERROR", "The simulation service hit an unexpected problem.")


@app.get("/api/health")
def health() -> dict[str, Any]:
    """A real check: build a Bell pair, run it, and confirm the counts make sense."""
    if _backend is None:
        return {
            "success": True,
            "data": {
                "backend": "online",
                "quantum_simulator": "unavailable",
                "engine": ENGINE,
                "detail": f"Qiskit could not be imported ({_import_error}). Install the packages in requirements.txt.",
            },
        }
    try:
        circuit = QuantumCircuit(2, 2)
        circuit.h(0)
        circuit.cx(0, 1)
        circuit.measure([0, 1], [0, 1])
        counts = run_circuit(circuit, 256)
        healthy = sum(counts.values()) == 256 and set(counts) <= {"00", "11"}
    except Exception:
        healthy = False
    return {
        "success": True,
        "data": {
            "backend": "online",
            "quantum_simulator": "online" if healthy else "unavailable",
            "engine": ENGINE,
            "detail": "Bell-pair self-test passed." if healthy else "The simulator self-test failed.",
        },
    }


@app.post("/api/simulate")
def simulate(request: SimulateRequest) -> dict[str, Any]:
    measured = validate(request)
    if _backend is None:
        raise ApiError(503, "SIMULATOR_UNAVAILABLE", "Quantum simulation service is currently unavailable.")
    try:
        circuit = build_circuit(request, measured)
        counts = run_circuit(circuit, request.shots)
        diagram = str(circuit.draw(output="text"))
    except ApiError:
        raise
    except Exception as error:
        raise ApiError(500, "SIMULATION_FAILED", "The circuit could not be simulated.") from error
    return {
        "success": True,
        "data": {
            "counts": counts,
            "shots": request.shots,
            "measured": measured,
            "backend": "qiskit",
            "engine": ENGINE,
            "diagram": diagram,
        },
    }
