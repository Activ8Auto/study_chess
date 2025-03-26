// import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
// import { useNavigate } from "react-router-dom";
// import useChessStore from "../store";

// export default function TopBar() {
//   const navigate = useNavigate();
//   const token = useChessStore((state) => state.token);
//   const logout = useChessStore((state) => state.logout);
//   const goToDashboard = () => {
//     navigate("/");
//   };

//   return (
//     <AppBar position="sticky" sx={{ backgroundColor: "#1e1e1e", mb: 2 }}>
//       <Toolbar>
//         <Typography variant="h6" sx={{ flexGrow: 1 }}>
//           Chess Study App
//         </Typography>
//         <Box>
//           <Button color="inherit" onClick={goToDashboard}>
//             Dashboard
//           </Button>
//         </Box>
//       </Toolbar>
//     </AppBar>
//   );
// }

// src/global/TopBar.js
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import useChessStore from "../store";

const TopBar = () => {
  const token = useChessStore((state) => state.token);
  const logout = useChessStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const goToDashboard = () => {
    navigate("/");
  };
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chess Notes
        </Typography>
        {token ? (
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <Button color="inherit" component={Link} to="/login">
            Login
          </Button>
          
        )}
        <Box>
          <Button color="inherit" onClick={goToDashboard}>
            Dashboard
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
