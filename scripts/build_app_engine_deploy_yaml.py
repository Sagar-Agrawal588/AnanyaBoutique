import argparse
import json
from pathlib import Path


def format_mapping(section_name, values):
    lines = [f"{section_name}:"]
    for key, value in values.items():
        lines.append(f"  {key}: {json.dumps(value)}")
    return lines


def replace_top_level_mapping(lines, section_name, values):
    rendered = format_mapping(section_name, values)
    start = None

    for index, line in enumerate(lines):
        if line.strip() == f"{section_name}:" and not line.startswith((" ", "\t")):
            start = index
            break

    if start is None:
        if lines and lines[-1].strip():
            lines.append("")
        lines.extend(rendered)
        return lines

    end = start + 1
    while end < len(lines):
        line = lines[end]
        stripped = line.strip()
        if stripped and not line.startswith((" ", "\t")):
            break
        end += 1

    return lines[:start] + rendered + lines[end:]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--env-json")
    parser.add_argument("--build-env-json")
    args = parser.parse_args()

    source_path = Path(args.source)
    target_path = Path(args.target)

    lines = source_path.read_text(encoding="utf-8").splitlines()

    if args.build_env_json:
        build_env = json.loads(args.build_env_json)
        lines = replace_top_level_mapping(lines, "build_env_variables", build_env)

    if args.env_json:
        env_values = json.loads(args.env_json)
        lines = replace_top_level_mapping(lines, "env_variables", env_values)

    target_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
