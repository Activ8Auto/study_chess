import React from "react";
import { Menu, MenuItem, FormControl, Select, InputLabel, Fade } from "@mui/material";

export default function SettingsMenu({
  settingsAnchorEl,
  setSettingsAnchorEl,
  mistakeThreshold,
  setMistakeThreshold,
  analysisDepth,
  setAnalysisDepth,
}) {
  return (
    <Menu
      id="settings-menu"
      anchorEl={settingsAnchorEl}
      open={Boolean(settingsAnchorEl)}
      onClose={() => setSettingsAnchorEl(null)}
      TransitionComponent={Fade}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <MenuItem sx={{ flexDirection: "column", p: 2, minWidth: "250px" }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="mistake-threshold-label">Mistake Threshold</InputLabel>
          <Select
            labelId="mistake-threshold-label"
            value={mistakeThreshold}
            onChange={(e) => setMistakeThreshold(e.target.value)}
            label="Mistake Threshold"
          >
            {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="analysis-depth-label">Analysis Depth</InputLabel>
          <Select
            labelId="analysis-depth-label"
            value={analysisDepth}
            onChange={(e) => setAnalysisDepth(e.target.value)}
            label="Analysis Depth"
          >
            {[14, 15, 16, 17, 18, 19, 20].map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </MenuItem>
    </Menu>
  );
}