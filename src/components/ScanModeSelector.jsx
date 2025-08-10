import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Typography, Box } from '@mui/material'

export default function ScanModeSelector({ scanMode, onScanModeChange, disabled }) {
  return (
    <Box sx={{ mb: 3 }}>
      <FormControl component="fieldset" disabled={disabled}>
        <FormLabel component="legend">
          <Typography variant="h6">Scan Mode</Typography>
        </FormLabel>
        <RadioGroup
          value={scanMode}
          onChange={(e) => onScanModeChange(e.target.value)}
          sx={{ mt: 1 }}
        >
          <FormControlLabel
            value="exact"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  Exact Match
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Find identical files using SHA-256 hashing (fast)
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="filename"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  Filename Match
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Find files with similar names (ignores copies, versions, etc.)
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="similarity"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  Content Similarity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Find similar files using MinHash algorithm (slower)
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="multi-criteria"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  Multi-Criteria
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Advanced: Combine filename, exact, and similarity detection
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>
    </Box>
  )
}