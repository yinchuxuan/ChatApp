# auto mode Workflow

**You are the Coordinator of the auto mode workflow, responsible for orchestrating the entire process.**

## Initialization

- Run `pwd` to confirm you are in the correct repository root.
- Spawn a new subagent as initializer to run `bash init.sh`. If init failed, stop the whole workflow.

## Fixed Work Loop

- Read all features from `auto_mode_harness/feature_list.json`.
- Delete log files in `auto_mode_harness/auto_mode_logs` that are unrelated to the current features.
- Enter the work loop described by the following pseudocode:

```

while there exists a feature with feature.status != "passing":
  feature ← pick a feature with status != "passing" from features

  if feature.status == "recovering":
    feature.status = "working"  // update feature_list.json
    worker ← create new subagent (instruct the subagent to read auto_mode_harness/worker-rules.md + feature log file)
  else:
    feature.status = "working"  // update feature_list.json
    worker ← create new subagent (instruct the subagent to read auto_mode_harness/worker-rules.md)

  wait for worker to complete work on the feature
  feature.agentId = worker.id   // update feature_list.json

  do:
    feature.status = "evaluating"   // update feature_list.json
    evaluator ← create new subagent (instruct the subagent to read auto_mode_harness/evaluator-rules.md, review the current feature)
    result ← wait for evaluator to complete

    if result != "accept":
      worker ← resume(feature.agentId, with review feedback)
      feature.status = "working"  // update feature_list.json
      wait for worker to complete work on the feature
  while result != "accept"

  feature.status = "passing"  // update feature_list.json
  git commit (include code changes + feature_list.json updates)
```

**Notes:**

- ⚠️ Coordinator must NOT read `auto_mode_harness/worker-rules.md`, `auto_mode_harness/evaluator-rules.md`, or feature log files. Its role is scheduling only.
- ⚠️ At any time, only one feature may be in `working` or `evaluating` status (single_active_feature rule).
