# Copyright (c) 2025 Ata Ul Haye.
#
# All rights reserved.
#
# This project, "Python Smart Automation" extension, including all associated source code,
# documentation, and related files, is the intellectual property of Ata Ul Haye. You may
# use, modify, and distribute this project in accordance with the terms of the MIT License.

import ast
import json
import sys


def validate_python_syntax(code: str):
    try:
        ast.parse(code)
        return {"valid": True, "error": None}
    except SyntaxError as e:
        return {
            "valid": False,
            "error": {"message": str(e), "line": e.lineno, "offset": e.offset},
        }


if __name__ == "__main__":
    # Read the input code from stdin
    input_code = sys.stdin.read()
    result = validate_python_syntax(input_code)
    # sys.stdout.flush()
    # Print the result as JSON
    print(json.dumps(result))
