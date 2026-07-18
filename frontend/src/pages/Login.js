import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
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

export default function Login({ onAuth, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
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
    <div className="auth-centered">
      <div className="auth-form-wrap" style={{ maxWidth: "400px" }}>
        <motion.div custom={0} initial="hidden" animate="visible" variants={fieldVariants}>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in to continue your interview prep</p>
        </motion.div>

        <motion.div custom={1} initial="hidden" animate="visible" variants={fieldVariants}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </motion.div>
        <motion.div custom={2} initial="hidden" animate="visible" variants={fieldVariants}>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </motion.div>

        {error && (
          <motion.div className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.div>
        )}

        <motion.div custom={3} initial="hidden" animate="visible" variants={fieldVariants}>
          <Button fullWidth size="lg" loading={loading} onClick={handleLogin}>
            Log In
          </Button>
        </motion.div>

        <p className="auth-switch">
          Don't have an account? <span onClick={onSwitchToSignup}>Sign up</span>
        </p>
      </div>
    </div>
  );
}