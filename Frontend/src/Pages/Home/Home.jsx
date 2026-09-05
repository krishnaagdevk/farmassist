import React, { useState, useEffect } from "react";
import "./Home.css";
import logo from "../../assets/images/logo.png"; // adjust if your assets folder is different
import Chatbox from "./Chatbox";
import LoginModal from "./LoginModal";
import LearningHub from "./LearningHub";
import RewardsModal from "./RewardsModal";


function Home() {
  const [queryCount, setQueryCount] = useState(1000);
  const [modal, setModal] = useState(null);

  // Counter animation
  useEffect(() => {
    let count = 1000;
    const target = 1200;
    const interval = setInterval(() => {
      if (count < target) {
        count++;
        setQueryCount(count);
      } else {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* ===== HEADER ===== */}
      <header>
        <div className="container nav-container">
          <div className="logo">
            <img src={logo} alt="FarmAssist Logo" className="logo-img" />
          </div>
          <nav>
            <a href="#features" className="nav-link">
              View Features
            </a>
          </nav>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-content">
          <h1>AI that talks Farmer.</h1>
          <p>Expert Farming Advice Anytime, Anywhere</p>
          <p className="stats">🌾 {queryCount}+ Queries Answered</p>

          <div className="hero-buttons">
            <button className="btn" onClick={() => setModal("login")}>
              Login
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setModal("signup")}
            >
              Sign Up
            </button>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="features">
        <h2>Our Core Features</h2>
        <div className="feature-cards">
          <div className="cardss ask-card" onClick={() => setModal("chatbox")}>
            <h3>Ask Your Question</h3>
            <p>Get instant AI guidance for your crops.</p>
          </div>
          <div className="cardss crop-card" onClick={() => setModal("login")}>
            <h3>Crop Calendar</h3>
            <p>Track sowing, irrigation, and harvest schedules.</p>
          </div>
          <div className="cardss weather-card" onClick={() => setModal("login")}>
            <h3>Weather Alerts</h3>
            <p>Stay updated with real-time weather conditions for your region.</p>
          </div>
          <div className="cardss market-card" onClick={() => setModal("login")}>
            <h3>Market Updates</h3>
            <p>Check current crop prices and trends at local markets.</p>
          </div>
          <div className="cardss forum-card" onClick={() => setModal("login")}>
            <h3>Community Forum</h3>
            <p>Connect and discuss with other farmers.</p>
          </div>
          <div
            className="cardss learning-card"
            onClick={() => setModal("learning")}
          >
            <h3>Learning Hub</h3>
            <p>Watch videos and take quizzes to improve skills.</p>
          </div>
          <div
            className="cardss rewards-card"
            onClick={() => setModal("rewards")}
          >
            <h3>Rewards & Coins</h3>
            <p>Earn points, badges, and climb the leaderboard.</p>
          </div>
          <div
            className="cardss officer-card"
            onClick={() => setModal("login")}
          >
            <h3>Officer Escalation</h3>
            <p>Send complex queries to local agricultural officers.</p>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <p>Empowering Farmers with AI 🌾</p>
      </footer>

      {/* ===== MODALS ===== */}
      {modal === "chatbox" && <Chatbox onClose={() => setModal(null)} />}
      {modal === "learning" && <LearningHub onClose={() => setModal(null)} />}
      {modal === "rewards" && <RewardsModal onClose={() => setModal(null)} />}
      {modal === "login" && (
        <LoginModal mode="login" onClose={() => setModal(null)} />
      )}
      {modal === "signup" && (
        <LoginModal mode="signup" onClose={() => setModal(null)} />
      )}
    </>
  );
}

export default Home;
