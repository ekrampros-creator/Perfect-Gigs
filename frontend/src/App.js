import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";

// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Gigs from "./pages/Gigs";
import GigDetail from "./pages/GigDetail";
import PostGig from "./pages/PostGig";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import FreelancerRegister from "./pages/FreelancerRegister";
import GigApplications from "./pages/GigApplications";
import Freelancers from "./pages/Freelancers";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/gigs" element={<Gigs />} />
            <Route path="/gigs/:gigId" element={<GigDetail />} />
            <Route path="/gigs/:gigId/applications" element={<GigApplications />} />
            <Route path="/post-gig" element={<PostGig />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:otherUserId" element={<Messages />} />
            <Route path="/freelancer/register" element={<FreelancerRegister />} />
            <Route path="/freelancers" element={<Freelancers />} />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right" 
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
