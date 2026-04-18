import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { getDefaultAuthenticatedPath } from "../utils/routing";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    vertical: "core",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!form.name?.trim()) newErrors.name = "Name is required";
    if (!form.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Valid email required";
    if (form.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (
      ![
        "core",
        "recruiters",
        "agencies",
        "realestate",
        "startups",
        "student",
      ].includes(form.vertical)
    ) {
      newErrors.vertical = "Select a workspace type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = await register({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        workspaceVertical: form.vertical,
      });

      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      navigate(getDefaultAuthenticatedPath(data.user));
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Registration failed";
      toast.error(errorMsg);
      console.error("Registration error:", {
        email: form.email,
        error: err.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Your name"
          required
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@example.com"
          required
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="min 8 characters"
          minLength={8}
          required
          error={errors.password}
        />

        {/* Vertical selection */}
        <div>
          <label
            style={{
              fontSize: "13px",
              fontWeight: "500",
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Workspace type
          </label>
          <select
            value={form.vertical}
            onChange={(e) =>
              setForm((f) => ({ ...f, vertical: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "8px 10px",
              border: `1px solid ${errors.vertical ? "var(--error)" : "var(--border)"}`,
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: "14px",
              outline: "none",
            }}
            required
          >
            <option value="">Select type...</option>
            <option value="core">General workspace</option>
            <option value="recruiters">Recruiter toolkit</option>
            <option value="agencies">Agency operations</option>
            <option value="realestate">Real estate</option>
            <option value="startups">Startup execution</option>
            <option value="student">Student workspace</option>
          </select>
          {errors.vertical && (
            <span
              style={{
                fontSize: "12px",
                color: "var(--error)",
                marginTop: "4px",
                display: "block",
              }}
            >
              {errors.vertical}
            </span>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          style={{ width: "100%", marginTop: "4px" }}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </div>
      <p
        style={{
          textAlign: "center",
          color: "var(--text-secondary)",
          fontSize: "14px",
        }}
      >
        Have an account?{" "}
        <Link
          to="/login"
          style={{ color: "var(--primary)", fontWeight: "500" }}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
