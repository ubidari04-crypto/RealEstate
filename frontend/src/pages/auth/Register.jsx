import React, { useState } from 'react';
import { registerStyles as s } from '../../assets/dummyStyles';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import { HiEye, HiEyeOff } from 'react-icons/hi';

const Register = () => {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "buyer",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [validationErrors, setValidationErrors] = useState({
        name: "",
        email: "",
        password: "",
    });

    const [touched, setTouched] = useState({
        name: false,
        email: false,
        password: false,
    });

    const { register } = useAuth();
    const navigate = useNavigate();

    // ==========================================
    // VALIDATE INDIVIDUAL FIELD
    // ==========================================
    const validateField = (name, value) => {

        let message = "";

        // ==========================================
        // FULL NAME
        // ==========================================
        if (name === "name") {

            const trimmedName = value.trim();

            // Empty field = no error
            if (trimmedName === "") {
                message = "";
            }

            // Minimum 2 characters
            else if (trimmedName.length < 2) {
                message =
                    "Full name must be at least 2 characters.";
            }

            // Only letters and spaces
            else if (!/^[A-Za-z ]+$/.test(trimmedName)) {
                message =
                    "Full name can contain only letters and spaces.";
            }
        }

        // ==========================================
        // EMAIL
        // ==========================================
        if (name === "email") {

            const email = value.trim();

            // Empty field = no error
            if (email === "") {
                message = "";
            }

            // Email must start with a letter
            else if (
                !/^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
                    email
                )
            ) {
                message =
                    "Email must start with a letter and be a valid email address.";
            }
        }

        // ==========================================
        // PASSWORD
        // ==========================================
        if (name === "password") {

            const password = value;

            // Empty field = no error
            if (password === "") {
                message = "";
            }

            // Minimum 8 characters
            else if (password.length < 8) {
                message =
                    "Password must be at least 8 characters.";
            }

            // At least one uppercase letter
            else if (!/[A-Z]/.test(password)) {
                message =
                    "Password must contain at least one uppercase letter.";
            }

            // At least one lowercase letter
            else if (!/[a-z]/.test(password)) {
                message =
                    "Password must contain at least one lowercase letter.";
            }

            // At least one number
            else if (!/[0-9]/.test(password)) {
                message =
                    "Password must contain at least one number.";
            }

            // At least one special character
            else if (
                !/[!@#$%^&*(),.?":{}|<>_\-\\[\]/`~';+=]/.test(password)
            ) {
                message =
                    "Password must contain at least one special character.";
            }
        }

        return message;
    };

    // ==========================================
    // HANDLE INPUT CHANGE
    // ==========================================
    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));

        setError("");
        setSuccess("");

        // Only validate these fields
        if (
            name === "name" ||
            name === "email" ||
            name === "password"
        ) {

            // Mark field as touched
            setTouched((previousTouched) => ({
                ...previousTouched,
                [name]: true
            }));

            // Validate immediately while typing
            const message = validateField(name, value);

            setValidationErrors((previousErrors) => ({
                ...previousErrors,
                [name]: message
            }));
        }
    };

    // ==========================================
    // HANDLE FORM SUBMIT
    // ==========================================
    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        /*
         * IMPORTANT:
         * Do NOT show "required" messages when the
         * Create Account button is clicked.
         *
         * If any field is empty, simply stop submission.
         */
        if (
            formData.name.trim() === "" ||
            formData.email.trim() === "" ||
            formData.password === ""
        ) {
            return;
        }

        // Validate fields that contain data
        const nameError = validateField(
            "name",
            formData.name
        );

        const emailError = validateField(
            "email",
            formData.email
        );

        const passwordError = validateField(
            "password",
            formData.password
        );

        // Update validation errors
        setValidationErrors({
            name: nameError,
            email: emailError,
            password: passwordError
        });

        // Stop if any validation error exists
        if (
            nameError ||
            emailError ||
            passwordError
        ) {
            return;
        }

        setIsLoading(true);

        try {

            const result = await register(formData);

            if (result.success) {

                setSuccess(
                    "Registration successful! Redirecting to verification..."
                );

                setTimeout(() => {

                    navigate("/verify-email", {
                        state: {
                            email: formData.email
                        }
                    });

                }, 1500);

            } else {

                setError(result.message);

            }

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
            );

        } finally {

            setIsLoading(false);

        }
    };

    return (
        <div className={s.pageWrapper}>

            <Navbar />

            <div className={s.container}>

                <div className={s.formCard}>

                    <h2 className={s.heading}>
                        Create Account
                    </h2>

                    <p className={s.subheading}>
                        Join our community to find or list properties
                    </p>

                    {/* General error */}
                    {error && (
                        <div className={s.errorMessage}>
                            {error}
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className={s.successMessage}>
                            {success}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className={s.form}
                        noValidate
                    >

                        {/* ==================================
                            FULL NAME
                        ================================== */}
                        <div>

                            <label className={s.label}>
                                Full Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                placeholder="Ram Karki"
                                value={formData.name}
                                onChange={handleChange}
                                className={s.input}
                            />

                            {touched.name &&
                                validationErrors.name && (
                                    <p
                                        style={{
                                            color: "#dc2626",
                                            fontSize: "14px",
                                            marginTop: "6px",
                                            marginBottom: "0"
                                        }}
                                    >
                                        {validationErrors.name}
                                    </p>
                                )}

                        </div>

                        {/* ==================================
                            EMAIL
                        ================================== */}
                        <div>

                            <label className={s.label}>
                                Email Address
                            </label>

                            <input
                                type="email"
                                name="email"
                                placeholder="name@gmail.com"
                                value={formData.email}
                                onChange={handleChange}
                                className={s.input}
                            />

                            {touched.email &&
                                validationErrors.email && (
                                    <p
                                        style={{
                                            color: "#dc2626",
                                            fontSize: "14px",
                                            marginTop: "6px",
                                            marginBottom: "0"
                                        }}
                                    >
                                        {validationErrors.email}
                                    </p>
                                )}

                        </div>

                        {/* ==================================
                            PASSWORD
                        ================================== */}
                        <div>

                            <label className={s.label}>
                                Password
                            </label>

                            <div
                                style={{
                                    position: "relative"
                                }}
                            >

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={s.input}
                                    style={{
                                        paddingRight: "40px"
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform:
                                            "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#6b7280",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: 0
                                    }}
                                >
                                    {showPassword ? (
                                        <HiEyeOff size={20} />
                                    ) : (
                                        <HiEye size={20} />
                                    )}
                                </button>

                            </div>

                            {touched.password &&
                                validationErrors.password && (
                                    <p
                                        style={{
                                            color: "#dc2626",
                                            fontSize: "14px",
                                            marginTop: "6px",
                                            marginBottom: "0"
                                        }}
                                    >
                                        {validationErrors.password}
                                    </p>
                                )}

                        </div>

                        {/* ==================================
                            SELECT ROLE
                        ================================== */}
                        <div>

                            <label className="block mb-3 font-medium">
                                Select Role
                            </label>

                            <div className={s.roleContainer}>

                                {/* BUYER */}
                                <label
                                    className={`${s.roleLabelBase} ${
                                        formData.role === "buyer"
                                            ? s.roleLabelActive
                                            : s.roleLabelInactive
                                    }`}
                                >

                                    <input
                                        type="radio"
                                        name="role"
                                        value="buyer"
                                        checked={
                                            formData.role === "buyer"
                                        }
                                        onChange={handleChange}
                                        className={s.hiddenRadio}
                                    />

                                    Buyer

                                </label>

                                {/* SELLER */}
                                <label
                                    className={`${s.roleLabelBase} ${
                                        formData.role === "seller"
                                            ? s.roleLabelActive
                                            : s.roleLabelInactive
                                    }`}
                                >

                                    <input
                                        type="radio"
                                        name="role"
                                        value="seller"
                                        checked={
                                            formData.role === "seller"
                                        }
                                        onChange={handleChange}
                                        className={s.hiddenRadio}
                                    />

                                    Seller

                                </label>

                            </div>

                        </div>

                        {/* ==================================
                            CREATE ACCOUNT BUTTON
                        ================================== */}
                        <button
                            className={s.submitButton}
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading
                                ? "Creating Account..."
                                : "Create Account"}
                        </button>

                    </form>

                    {/* ==================================
                        LOGIN LINK
                    ================================== */}
                    <p className={s.footerText}>
                        Already have an account{" "}
                        <Link
                            to="/login"
                            className={s.loginLink}
                        >
                            Sign in here
                        </Link>
                    </p>

                </div>

            </div>

        </div>
    );
};

export default Register;