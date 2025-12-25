import React from 'react';
import { Box, Button, Container, Typography, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Background from '../components/Background';

export default function Landing() {
  return (
    <>
      <Background />
      <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%' }}>
          <Stack spacing={3} alignItems="flex-start">
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
              AI-Powered Stock Screener And Advisory Platform
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Intelligent screening, insightful advisory — built for the web. Discover top stock opportunities with AI-driven signals and concise recommendations.
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" size="large" component={RouterLink} to="/login">
                Get Started
              </Button>
              <Button variant="outlined" size="large" component={RouterLink} to="/register">
                Create Account
              </Button>
            </Stack>

            <Box sx={{ mt: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Key features</Typography>
              <ul>
                <li>Customizable stock filters and AI ranking</li>
                <li>Upload CSVs and chat with the assistant</li>
                <li>Secure auth with OTP verification</li>
              </ul>
            </Box>
          </Stack>
        </Box>
      </Container>
    </>
  );
}
