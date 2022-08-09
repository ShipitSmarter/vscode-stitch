# Development readme

## Creating a pre-release

To create a pre-release

```
npm run prerelease
```

### Manual process
1. Update package.json to desired version (e.g. releasing 1.2.0 -> use 1.2.[yyyymmdd##] so `1.2.2022061701`)
2. Run `vsce package --pre-release`
3. Upload the created *.vsix to https://marketplace.visualstudio.com/manage/publishers/shipitsmarter