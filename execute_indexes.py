import subprocess

with open('create_indexes.sql', 'r') as f:
    lines = [l.strip() for l in f if l.strip()]

import json
# Get project connection info or we can just call MCP sequentially from the agent itself.
# Since the agent handles MCP nicely, printing them as JSON array to be executed by a single MCP call isn't an option (MCP server puts all statements in one transaction).
# Oh wait, we can just execute them one by one through MCP in python by making API requests? No.
