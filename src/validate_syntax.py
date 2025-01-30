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
