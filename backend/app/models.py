"""Session and step data models."""
from typing import Any, Literal

WizardStep = Literal[
    "look_and_feel",
    "context",
    "reference_image",
    "generate_variants",
    "pick_one",
    "materials",
    "export",
]
SessionData = dict[str, Any]  # camelCase keys for frontend: id, createdAt, currentStep, etc.
