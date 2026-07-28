Exception: in autonomous-execution mode (single-session test runs, agent-led sweeps),
document the skipped approval gate in the task file's **Deferrals & Decisions** before
proceeding. This repository is configured **autonomous**
(`prompts.values.AUTONOMY_MODE`): the mode is the configuration's statement — an agent
never assesses which mode its own session is in.
