import { Radio, Tooltip } from '@mui/material'

export default function OriginalFileSelector({ 
  groupId, 
  filePath, 
  isOriginal, 
  onOriginalSelect, 
  disabled = false,
  fileState = 'exists'
}) {
  const isDisabled = disabled || fileState !== 'exists'
  
  return (
    <Tooltip 
      title={
        isDisabled 
          ? fileState === 'exists' 
            ? "Cannot select deleted or moved file as original" 
            : "File is no longer available"
          : "Select as original file to keep"
      }
      placement="top"
    >
      <span>
        <Radio
          checked={isOriginal}
          onChange={() => !isDisabled && onOriginalSelect(groupId, filePath)}
          value={filePath}
          name={`original-${groupId}`}
          disabled={isDisabled}
          size="small"
          sx={{
            opacity: isDisabled ? 0.5 : 1,
            '&.Mui-disabled': {
              color: 'text.disabled'
            }
          }}
        />
      </span>
    </Tooltip>
  )
}