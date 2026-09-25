import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { SeverityColor } from "../../utils/severity";

export interface StatCardBadge {
  label: string;
  /** Either a fixed hex/token color, or a severity key resolved via the theme palette. */
  color: string;
  /** Overrides the auto-computed contrast text color when set. */
  textColor?: string;
}

export interface StatCardProgress {
  /** 0-100. */
  value: number;
  color: SeverityColor;
}

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  badge?: StatCardBadge;
  progress?: StatCardProgress;
  fullWidth?: boolean;
  borderColor?: string;
}

/**
 * Reusable, prop-driven stat display: icon + label + value, with an optional
 * color-coded badge or progress bar. No context or data-fetching of its own.
 */
export const StatCard = ({
  icon,
  label,
  value,
  badge,
  progress,
  fullWidth,
  borderColor,
}: StatCardProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        gridColumn: fullWidth ? "1 / -1" : undefined,
        borderLeft: borderColor ? `2px solid ${borderColor}` : undefined,
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            color: "grey.600",
            display: "flex",
            "& svg": { fontSize: 16 },
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" sx={{ color: "grey.600" }}>
          {label}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        {badge && (
          <Chip
            size="small"
            label={badge.label}
            sx={(theme) => ({
              bgcolor: badge.color,
              color:
                badge.textColor ?? theme.palette.getContrastText(badge.color),
              fontWeight: 700,
            })}
          />
        )}
      </Stack>
      {progress && (
        <LinearProgress
          variant="determinate"
          value={progress.value}
          color={progress.color}
          sx={{ mt: 1, height: 8, borderRadius: 4 }}
        />
      )}
    </Paper>
  );
};
