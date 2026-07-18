import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import RadarScene from "../components/scenes/RadarScene";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import "./Auth.css";

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: "spring", stiffness: 320, damping: 32, mass: 0.9 },
  }),
};

export default function Signup({ onAuth, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/signup`, { name, email, password });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onAuth(res.data.user);
      }
    } catch (err) {
      setError("Cannot connect to server");
    }
    setLoading(false);
  }

  return (
    <div className="auth-split">
      <div className="auth-hook">
        <RadarScene />
        <div className="auth-hook-caption">
          <p className="auth-hook-label">Waiting for your first session</p>
          <p className="auth-hook-text">
            Technical &middot; Communication &middot; Problem Solving<br />
            Cultural Fit &middot; Confidence
          </p>
        </div>
      </div>

      <div className="auth-action">
        <div className="auth-form-wrap">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fieldVariants}>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start practicing with AI-powered mock interviews</p>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={fieldVariants}>
            <Input label="Full Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          </motion.div>
          <motion.div custom={2} initial="hidden" animate="visible" variants={fieldVariants}>
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </motion.div>
          <motion.div custom={3} initial="hidden" animate="visible" variants={fieldVariants}>
            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            />
          </motion.div>

          {error && (
            <motion.div className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {error}
            </motion.div>
          )}

          <motion.div custom={4} initial="hidden" animate="visible" variants={fieldVariants}>
            <Button fullWidth size="lg" loading={loading} onClick={handleSignup} className="auth-shimmer-btn">
              Create Account
            </Button>
          </motion.div>

          <p className="auth-switch">
            Already have an account? <span onClick={onSwitchToLogin}>Log in</span>
          </p>
        </div>
      </div>
    </div>
  );
}