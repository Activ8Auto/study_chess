import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();

  const goToDashboard = () => {
    navigate("/");
  };

  return (
    <AppBar position="sticky" sx={{ backgroundColor: "#1e1e1e", mb: 2 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chess Study App
        </Typography>
        <Box>
          <Button color="inherit" onClick={goToDashboard}>
            Dashboard
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
