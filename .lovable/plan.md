
# Reset Analysis Data for Demo Jobs

## Summary
I'll clear the AI analysis data from the specified jobs so you can walk through the analysis process step-by-step with someone.

## Jobs to Reset

| Job # | Client | Rugs | Action |
|-------|--------|------|--------|
| 123123 | mark | 1 rug | Clear analysis |
| asda | Mark Megerian | 1 rug | Clear analysis |
| Kaye | Annie kate | 1 rug | Clear analysis |
| Julia | Julia Rega | 1 rug | Clear analysis |
| Martha | Martha Parker | 2 rugs | Clear analysis |

**Total: 6 rugs across 5 jobs**

## What Will Be Reset
For each rug (inspection):
- `analysis_report` - Set to NULL (removes the AI-generated report)
- `image_annotations` - Set to NULL (removes any damage markers)
- `estimate_approved` - Set to false (allows re-approval)

Also need to remove any approved estimates for these jobs so the workflow starts fresh.

## Technical Details

### Step 1: Clear Inspection Analysis Data
Run SQL update to reset analysis fields on the 6 inspections identified.

### Step 2: Remove Approved Estimates
Delete any `approved_estimates` records linked to these jobs so the estimate approval step can be redone.

### Step 3: Reset Job Status (Optional)
If you want jobs to appear as "active" again, can also reset the `all_estimates_approved` flag on the jobs table.

## After Reset
You'll be able to:
1. Open each job and see rugs without analysis
2. Click "Analyze" to run the AI analysis fresh
3. Review and approve estimates
4. Walk through the complete workflow
