"""
System prompt and structured-output JSON schema for SnapCAD's geometric engine.

The model receives a photo of a mechanical/industrial part and returns a strict
JSON description of its 2D geometry in a normalized pixel space, plus the
candidate dimensions a technical drawing would annotate.
"""

# Coordinate space: the analyzed image is mapped so its LONGEST side = 1000 px,
# preserving aspect ratio. Origin top-left, +x right, +y down (SVG convention).
CANVAS_LONG_SIDE = 1000

SYSTEM_PROMPT = f"""You are SnapCAD's geometric analysis engine. You receive a single \
photograph of a mechanical or industrial part and produce a clean 2D technical \
sketch (croquis) of its most representative orthographic view.

GOAL
- Identify the dominant flat view of the part (front or top face — the one that
  best shows its outline and holes).
- Extract its 2D geometry as primitive entities: straight edges (line),
  full holes/bosses (circle), rectangular outlines (rect), and fillets/rounded
  corners or partial arcs (arc).
- Identify the principal DIMENSIONS that a real engineering drawing would
  annotate: overall width, overall height, hole diameters, hole-to-hole or
  hole-to-edge distances, slot lengths, etc.

COORDINATE SYSTEM (critical)
- Use a 2D pixel space where the image's LONGEST side equals {CANVAS_LONG_SIDE}
  units, preserving the real aspect ratio. Set image_width and image_height
  accordingly (one of them is {CANVAS_LONG_SIDE}).
- Origin is the TOP-LEFT corner. +x goes right, +y goes down.
- Every coordinate must be consistent and proportional to what you actually see
  in the photo. Keep the part roughly centered with a small margin.

DIMENSIONS
- Each dimension carries `px`: the pixel-space length it represents (a positive
  number). This is what the frontend multiplies by the user's mm/px ratio.
- For `linear`: (x1,y1)-(x2,y2) is the segment being measured; px = its length.
- For `diameter`: center at (x1,y1); px = the diameter in pixels; set (x2,y2)
  equal to (x1,y1).
- For `radius`: center at (x1,y1); px = the radius in pixels; (x2,y2)=(x1,y1).
- Give each dimension a short default label like "W1", "H1", "D1" — the user
  will assign real millimetre values later. Do NOT invent millimetre numbers.
- Order dimensions from most to least important. Return between 3 and 12.

QUALITY RULES
- Return ONLY data that matches the schema. No commentary.
- Prefer a faithful, simplified croquis over photographic detail. Straighten
  edges, close outlines, and represent holes as perfect circles.
- If the part is at an angle, mentally rectify it to a clean orthographic view.
- `confidence` is your 0..1 estimate of how reliable the extracted geometry is.
"""

# JSON Schema for output_config.format (structured outputs). Every object sets
# additionalProperties:false and lists all properties as required, per the API.
GEOMETRY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "image_width": {"type": "number"},
        "image_height": {"type": "number"},
        "part_name": {"type": "string"},
        "view": {"type": "string"},
        "confidence": {"type": "number"},
        "entities": {
            "type": "array",
            "items": {
                "anyOf": [
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string", "const": "line"},
                            "x1": {"type": "number"},
                            "y1": {"type": "number"},
                            "x2": {"type": "number"},
                            "y2": {"type": "number"},
                        },
                        "required": ["id", "type", "x1", "y1", "x2", "y2"],
                    },
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string", "const": "circle"},
                            "cx": {"type": "number"},
                            "cy": {"type": "number"},
                            "r": {"type": "number"},
                        },
                        "required": ["id", "type", "cx", "cy", "r"],
                    },
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string", "const": "rect"},
                            "x": {"type": "number"},
                            "y": {"type": "number"},
                            "w": {"type": "number"},
                            "h": {"type": "number"},
                        },
                        "required": ["id", "type", "x", "y", "w", "h"],
                    },
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string", "const": "arc"},
                            "cx": {"type": "number"},
                            "cy": {"type": "number"},
                            "r": {"type": "number"},
                            "start_angle": {"type": "number"},
                            "end_angle": {"type": "number"},
                        },
                        "required": [
                            "id", "type", "cx", "cy", "r",
                            "start_angle", "end_angle",
                        ],
                    },
                ]
            },
        },
        "dimensions": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "id": {"type": "string"},
                    "kind": {
                        "type": "string",
                        "enum": ["linear", "diameter", "radius"],
                    },
                    "x1": {"type": "number"},
                    "y1": {"type": "number"},
                    "x2": {"type": "number"},
                    "y2": {"type": "number"},
                    "px": {"type": "number"},
                    "label": {"type": "string"},
                },
                "required": ["id", "kind", "x1", "y1", "x2", "y2", "px", "label"],
            },
        },
    },
    "required": [
        "image_width", "image_height", "part_name", "view",
        "confidence", "entities", "dimensions",
    ],
}

USER_INSTRUCTION = (
    "Analyze this part photo and return the structured 2D geometry and "
    "candidate dimensions for a technical drawing, following the schema exactly."
)
