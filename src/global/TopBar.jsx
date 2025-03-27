import { AppBar, Toolbar, Typography, Box, Button, Menu, MenuItem, IconButton } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import useChessStore from "../store";
import SettingsIcon from "@mui/icons-material/Settings"; // Import Settings icon
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"; // Import dropdown arrow
import React, { useState } from "react";
import LogoutIcon from '@mui/icons-material/Logout';


const TopBar = () => {
  const token = useChessStore((state) => state.token);
  const logout = useChessStore((state) => state.logout);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null); // For dropdown menu

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const goToDashboard = () => {
    navigate("/");
    setAnchorEl(null); // Close menu if open
  };

  const goToSettings = () => {
    navigate("/settings");
    setAnchorEl(null); // Close menu
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chess Notes
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {token ? (
            <>
              {/* Dashboard with Dropdown */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Button
                  color="inherit"
                  onClick={goToDashboard} // Direct click goes to dashboard
                  sx={{ mr: -1 }} // Adjust spacing
                >
                  Dashboard
                </Button>
                <IconButton
                  color="inherit"
                  onClick={handleMenuOpen}
                  size="small"
                >
                  <ArrowDropDownIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {/* <MenuItem onClick={goToDashboard}>Dashboard</MenuItem> */}
                  <MenuItem onClick={goToSettings}>
                    <SettingsIcon sx={{ mr: 1 }} /> Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}><LogoutIcon sx={{mr:1}} /> Logout</MenuItem>
                </Menu>
              </Box>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;