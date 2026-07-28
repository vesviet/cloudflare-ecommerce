import subprocess
import os
import glob

project_root = "/home/user/personalized/cloudflare-ecommerce"
public_api_src = os.path.join(project_root, "apps/public-api/src")
admin_api_src = os.path.join(project_root, "apps/admin-api/src")

def run_cmd(cmd, cwd=project_root):
    res = subprocess.run(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return res.returncode, res.stdout + res.stderr

print("=== Checking Baseline Clean Linting ===")
rc, out = run_cmd("pnpm --filter public-api lint")
print(f"public-api baseline: exit {rc}")
assert rc == 0, f"public-api baseline failed:\n{out}"

rc, out = run_cmd("pnpm --filter admin-api lint")
print(f"admin-api baseline: exit {rc}")
assert rc == 0, f"admin-api baseline failed:\n{out}"

print("\n=== Testing public-api Boundary Rules ===")
public_api_tests = [
    ("Relative file import", "import { auditLogger } from '../../admin-api/src/middleware/audit';"),
    ("Relative index import", "import { cms } from '../../admin-api';"),
    ("Package import", "import { helper } from 'admin-api';"),
    ("Package subpath import", "import { helper } from 'admin-api/src/helper';"),
    ("Type import", "import type { AdminType } from '../../admin-api/src/types';"),
    ("Query string bypass attempt", "import { auditLogger } from '../../admin-api/src/middleware/audit?bypass=true';")
]

expected_public_msg = "Cross-app imports from admin-api into public-api are strictly forbidden"

for name, code in public_api_tests:
    tf = os.path.join(public_api_src, "_reviewer_test_case.ts")
    with open(tf, "w") as f:
        f.write(code + "\nconsole.log(1);\n")
    try:
        rc, out = run_cmd("pnpm --filter public-api lint")
        if rc != 0 and expected_public_msg in out and "no-restricted-imports" in out:
            print(f"  [PASS] {name}: Correctly blocked with expected error")
        else:
            print(f"  [FAIL] {name}: Failed to block or wrong error output:\nExit: {rc}\nOutput:\n{out}")
    finally:
        if os.path.exists(tf):
            os.remove(tf)

print("\n=== Testing admin-api Boundary Rules ===")
admin_api_tests = [
    ("Relative file import", "import { checkout } from '../../public-api/src/routes/checkout';"),
    ("Relative index import", "import { pub } from '../../public-api';"),
    ("Package import", "import { helper } from 'public-api';"),
    ("Package subpath import", "import { helper } from 'public-api/src/helper';"),
    ("Type import", "import type { PublicType } from '../../public-api/src/types';"),
    ("Query string bypass attempt", "import { checkout } from '../../public-api/src/routes/checkout?bypass=true';")
]

expected_admin_msg = "Cross-app imports from public-api into admin-api are strictly forbidden"

for name, code in admin_api_tests:
    tf = os.path.join(admin_api_src, "_reviewer_test_case.ts")
    with open(tf, "w") as f:
        f.write(code + "\nconsole.log(1);\n")
    try:
        rc, out = run_cmd("pnpm --filter admin-api lint")
        if rc != 0 and expected_admin_msg in out and "no-restricted-imports" in out:
            print(f"  [PASS] {name}: Correctly blocked with expected error")
        else:
            print(f"  [FAIL] {name}: Failed to block or wrong error output:\nExit: {rc}\nOutput:\n{out}")
    finally:
        if os.path.exists(tf):
            os.remove(tf)

print("\n=== Baseline Re-Check ===")
rc, out = run_cmd("pnpm --filter public-api lint")
print(f"public-api re-check: exit {rc}")
assert rc == 0

rc, out = run_cmd("pnpm --filter admin-api lint")
print(f"admin-api re-check: exit {rc}")
assert rc == 0

print("\nAll boundary tests completed cleanly!")
