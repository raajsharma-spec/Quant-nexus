"""
Tests for the optional Qiskit service.

Run from the backend folder:
    python -m pytest
"""

import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)

needs_simulator = pytest.mark.skipif(main._backend is None, reason="Qiskit is not installed")


def simulate(qubits, gates, shots=512):
    return client.post("/api/simulate", json={"qubits": qubits, "shots": shots, "gates": gates})


def gate(kind, qubit, step, **extra):
    return {"type": kind, "qubit": qubit, "step": step, **extra}


def test_health_reports_a_real_check():
    body = client.get("/api/health").json()
    assert body["success"] is True
    assert body["data"]["backend"] == "online"
    expected = "online" if main._backend is not None else "unavailable"
    assert body["data"]["quantum_simulator"] == expected


@needs_simulator
def test_x_gate_always_gives_one():
    body = simulate(1, [gate("X", 0, 0), gate("M", 0, 1)]).json()
    assert body["success"] is True
    assert body["data"]["counts"] == {"1": 512}
    assert body["data"]["shots"] == 512


@needs_simulator
def test_h_gate_gives_both_results_and_counts_add_up():
    body = simulate(1, [gate("H", 0, 0), gate("M", 0, 1)], shots=2000).json()
    counts = body["data"]["counts"]
    assert sum(counts.values()) == 2000
    assert set(counts) == {"0", "1"}
    assert 800 < counts["0"] < 1200  # far outside this range would not be 50/50


@needs_simulator
def test_h_twice_returns_to_zero():
    body = simulate(1, [gate("H", 0, 0), gate("H", 0, 1), gate("M", 0, 2)]).json()
    assert body["data"]["counts"] == {"0": 512}


@needs_simulator
def test_bell_pair_is_correlated():
    gates = [gate("H", 0, 0), gate("CX", 0, 1, target=1), gate("M", 0, 2), gate("M", 1, 2)]
    counts = simulate(2, gates, shots=1000).json()["data"]["counts"]
    assert set(counts) <= {"00", "11"}
    assert sum(counts.values()) == 1000


@needs_simulator
def test_bit_order_puts_q0_on_the_left():
    # X on q0 only: Quantum Nexus writes this as "10" (q0 first).
    gates = [gate("X", 0, 0), gate("M", 0, 1), gate("M", 1, 1)]
    assert simulate(2, gates).json()["data"]["counts"] == {"10": 512}


@needs_simulator
def test_only_measured_qubits_are_reported():
    # q1 is flipped and measured; q0 is not measured.
    gates = [gate("X", 1, 0), gate("M", 1, 1)]
    assert simulate(2, gates).json()["data"]["counts"] == {"1": 512}


@needs_simulator
def test_toffoli_and_rotation_gates():
    gates = [
        gate("X", 0, 0),
        gate("RX", 1, 0, theta=3.141592653589793),
        gate("CCX", 0, 1, target=2, control2=1),
        gate("M", 2, 2),
    ]
    assert simulate(3, gates).json()["data"]["counts"] == {"1": 512}


@needs_simulator
def test_response_includes_a_circuit_diagram():
    body = simulate(1, [gate("H", 0, 0), gate("M", 0, 1)]).json()
    assert "H" in body["data"]["diagram"]


def assert_error(response, status, code):
    body = response.json()
    assert response.status_code == status
    assert body["success"] is False
    assert body["error"]["code"] == code
    assert body["error"]["message"]
    assert "Traceback" not in body["error"]["message"]


def test_rejects_too_many_qubits():
    assert_error(simulate(9, [gate("H", 0, 0), gate("M", 0, 1)]), 400, "INVALID_REQUEST")


def test_rejects_too_many_shots():
    assert_error(simulate(1, [gate("H", 0, 0), gate("M", 0, 1)], shots=1_000_000), 400, "INVALID_REQUEST")


def test_rejects_unknown_gate():
    assert_error(simulate(1, [gate("EVIL", 0, 0), gate("M", 0, 1)]), 400, "INVALID_REQUEST")


def test_rejects_qubit_out_of_range():
    assert_error(simulate(1, [gate("H", 3, 0), gate("M", 0, 1)]), 400, "INVALID_REQUEST")


def test_rejects_circuit_without_measurement():
    assert_error(simulate(1, [gate("H", 0, 0)]), 400, "NO_MEASUREMENT")


def test_rejects_gate_after_measurement():
    assert_error(simulate(1, [gate("M", 0, 0), gate("X", 0, 1)]), 400, "GATE_AFTER_MEASUREMENT")


def test_rejects_cx_on_one_qubit():
    assert_error(simulate(2, [gate("CX", 0, 0, target=0), gate("M", 0, 1)]), 400, "INVALID_CX")


def test_rejects_empty_circuit():
    assert_error(simulate(1, []), 400, "EMPTY")


def test_rejects_malformed_body():
    assert_error(client.post("/api/simulate", json={"qubits": "two"}), 422, "INVALID_REQUEST")


def test_unknown_route_returns_structured_error():
    assert_error(client.get("/api/does-not-exist"), 404, "NOT_FOUND")
