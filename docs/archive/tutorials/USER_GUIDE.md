---
title: "DevStudio User/Dev Guide"
status: draft
last_updated: 2026-05-26T15:10:21+10:00
category: guide
tags: [devstudio, guide]
description: "This guide explains how to use DevStudio for managing projects, configurations, and agentic workflows. It is intended..."
---
# DevStudio User/Dev Guide

This guide explains how to use DevStudio for managing projects, configurations, and agentic workflows. It is intended for both users and developers who want to work on projects like Snackbar or uDos.

## Overview

DevStudio is a centralized development environment that integrates with the `Projects` directory to provide a unified setup for all your development needs. It supports:

- **Centralized Project Configuration**: All project configurations are stored in `~/Code/Projects/`.
- **Agentic Workflows**: Automated workflows for development tasks.
- **LeChat Pro API Integration**: Unified API for logging, messaging, and other services.
- **Compartmentalized Project Work**: Each project is isolated and can be worked on independently.

## Getting Started

### 1. Navigate to DevStudio
```bash
cd ~/Code/DevStudio
```

### 2. Load a Project Configuration
Use DevStudio to load a project's configuration:

```bash
devstudio config load-project Snackbar
```

This will display the Snackbar configuration, including the LeChat Pro API settings.

### 3. Update DevStudio Configuration
Edit the main DevStudio configuration:

```bash
devstudio config show
devstudio config set agentic_workflows.llm_provider deepseek
```

### 4. Run Agentic Workflows
DevStudio supports automated workflows for development tasks. See the `workflows/` directory for examples.

## Configuration

### Main Configuration (`config.yaml`)
The main DevStudio configuration is located at `~/Code/DevStudio/config.yaml`. It includes settings for:

- **Agentic Workflows**: LLM provider, workflow directory, max steps, etc.
- **Projects Directory**: Path to the centralized Projects directory.
- **LeChat Pro API**: API key and URL for the LeChat Pro service.
- **Discovery Agent**: Sandbox settings, timeouts, and test patterns.
- **EEA (Extended Editing Agent)**: Editor settings, backup directory, etc.
- **MCP (Multi-Project Control)**: Socket path and timeout settings.
- **Logging**: Log level and log file path.
- **GitHub**: API URL, token path, and default repository.
- **Vault**: Paths to Vault, Sandbox, and Registry directories.

### Project Configuration (`Projects/<project>/config/config.yaml`)
Each project has its own configuration file with settings for:

- **LeChat Pro API**: API key, URL, and enabled flag.
- **Project-Specific Settings**: Debug mode, log level, memory path, etc.

## Commands

### `devstudio config`
Manage DevStudio and project configurations.

```bash
devstudio config show              # Show current DevStudio configuration
devstudio config set <key> <value> # Set a configuration value
devstudio config get <key>         # Get a configuration value
devstudio config load-project <name> # Load a project's configuration
```

### `devstudio` (Main Command)
Run DevStudio with various options.

```bash
devstudio help  # Show help
```

### Release & Publishing Commands

```bash
# Release all components (tags + pushes to trigger GitHub Actions)
release all v1.0.0

# Release a specific org
release okagent v1.0.0
release udosgo v1.0.0

# Publish vault to Linux
release vault
vault-publish          # Same, directly

# Via dev CLI
ud release             # Interactive release creation
ud vault               # Publish vault to Linux
ud actions             # Open GitHub Actions
ud inbox               # Open Continue Mission Control inbox
```

See [docs/WORKFLOW_PIPELINE.md](docs/WORKFLOW_PIPELINE.md) for full pipeline documentation.

## Working on Projects

### uDos Project
To work on the uDos project:

1. Load the uDos configuration:
   ```bash
   devstudio config load-project uDos
   ```

2. Navigate to the uDos codebase:
   ```bash
   cd ~/Code/uDosGo
   ```

3. Update the uDos code to use the `ConfigManager` (similar to Snackbar).

4. Test the configuration and ensure the LeChat Pro API is working.

### Snackbar Project
To work on the Snackbar project:

1. Load the Snackbar configuration:
   ```bash
   devstudio config load-project Snackbar
   ```

2. Navigate to the Snackbar codebase:
   ```bash
   cd ~/Code/Apps/Snackbar
   ```

3. Run Snackbar:
   ```bash
   ./launch.sh
   ```

## Adding a New Project

To add a new project to the centralized configuration system:

1. Create the project directory:
   ```bash
   mkdir -p ~/Code/Projects/YourProject/config
   ```

2. Create the configuration file:
   ```bash
   touch ~/Code/Projects/YourProject/config/config.yaml
   ```

3. Add the configuration:
   ```yaml
   # YourProject Configuration
   lechat:
     api_key: "your_api_key_here"
     api_url: "https://api.lechat.pro"
     enabled: true
   
   your_project:
     debug_mode: false
     log_level: "info"
   ```

4. Update your project code to use the `ConfigManager`.

## Troubleshooting

### Issue: Configuration Not Found
- Ensure the `Projects` directory exists at `~/Code/Projects/`.
- Verify the project name in the `ConfigManager` matches the directory name.
- Check for typos in the configuration file path.

### Issue: DevStudio Cannot Load Project
- Ensure DevStudio's `config.yaml` has the correct `projects_dir` path.
- Verify the project configuration file exists at `~/Code/Projects/YourProject/config/config.yaml`.

### Issue: LeChat API Not Working
- Verify the `api_key` and `api_url` in the project's `config.yaml`.
- Ensure the `enabled` flag is set to `true`.
- Check the network connection and API endpoint.

## Documentation

- **Projects README**: `~/Code/Projects/README.md` - Overview of the Projects directory.
- **Next Agent Guide**: `~/Code/Projects/NEXT_AGENT_GUIDE.md` - Guide for working on projects like uDos.
- **DevStudio Config**: `~/Code/DevStudio/config.sh` - Configuration management script.

## License

DevStudio is licensed under the MIT License. See the `LICENSE` file for details.
