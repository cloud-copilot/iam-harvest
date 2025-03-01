# IAM Harvest
Harvests AWS IAM Metadata and publishes to different libraries to assist with automation.

## Status
[![Build Status](https://github.com/cloud-copilot/iam-harvest/actions/workflows/update-packages.yml/badge.svg)](https://github.com/cloud-copilot/iam-harvest/actions/workflows/update-packages.yml)

### Packages
This publishes to three different packages nightly **if there are changes to the data**:

|Runtime|Github|Package|
|----------|:--------|:---------|
|Node/Browser|[iam-data](https://github.com/cloud-copilot/iam-data)| [@cloud-copilot/iam-data](https://www.npmjs.com/package/@cloud-copilot/iam-data)|
|Go|[iam-data-go](https://github.com/cloud-copilot/iam-data-go)|[iam-data-go](https://pkg.go.dev/github.com/cloud-copilot/iam-data-go/iamdata)|
|Python|[iam-data-python](https://github.com/cloud-copilot/iam-data-python)|[iamdata](https://pypi.org/project/iamdata/)|
