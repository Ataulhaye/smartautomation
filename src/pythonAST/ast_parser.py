import ast
import json
import sys

class ASTAnalyzer(ast.NodeVisitor):
    """ AST Visitor to extract important nodes from Python code. """
    
    def __init__(self):
        self.results = {"functions": [], "classes": [], "loops": [], "conditionals": [], "assignments": [], "imports": [], "comments": []}

    def visit_FunctionDef(self, node):
        self.results["functions"].append({
            "name": node.name,
            "lineno": node.lineno,
            "args": [arg.arg for arg in node.args.args]
        })
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        self.results["classes"].append({
            "name": node.name,
            "lineno": node.lineno
        })
        self.generic_visit(node)

    def visit_For(self, node):
        self.results["loops"].append({
            "type": "for",
            "lineno": node.lineno
        })
        self.generic_visit(node)

    def visit_While(self, node):
        self.results["loops"].append({
            "type": "while",
            "lineno": node.lineno
        })
        self.generic_visit(node)

    def visit_If(self, node):
        self.results["conditionals"].append({
            "lineno": node.lineno
        })
        self.generic_visit(node)

    def visit_Assign(self, node):
        targets = [target.id for target in node.targets if isinstance(target, ast.Name)]
        if targets:
            self.results["assignments"].append({
                "targets": targets,
                "lineno": node.lineno
            })
        self.generic_visit(node)

    def visit_Import(self, node):
        self.results["imports"].append({
            "modules": [alias.name for alias in node.names],
            "lineno": node.lineno
        })
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        self.results["imports"].append({
            "modules": [alias.name for alias in node.names],
            "from": node.module,
            "lineno": node.lineno
        })
        self.generic_visit(node)
        
    def visit_FunctionDef(self, node):
        self.results["comments"].append({
            "name": node.name,
            "lineno": node.lineno,
            "args": [arg.arg for arg in node.args.args]
        })
        self.generic_visit(node)

def analyze_code(source_code):
    """ Parses Python code and returns AST-based analysis as JSON only if valid """
    try:
        tree = ast.parse(source_code)  # Attempt to parse the code
        analyzer = ASTAnalyzer()
        analyzer.visit(tree)
        return json.dumps({"success": True, "ast": analyzer.results}, indent=4)

    except SyntaxError as e:
        return json.dumps({"success": False, "error": str(e), "lineno": e.lineno, "col_offset": e.offset}, indent=4)

if __name__ == "__main__":
    # Read Python code from standard input
    code = sys.stdin.read()
    print(analyze_code(code))
