import React, { useState } from 'react';
import { contactStyles as s } from '../../assets/dummyStyles';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import API_URL from '../../config';
import Navbar from '../../components/common/Navbar';
import {
    HiOutlineCheckCircle,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineUser,
} from 'react-icons/hi';

const Contact = () => {

    const { user } = useAuth();

    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        message: "",
        role: user?.role || "buyer",
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        // Nepal mobile number validation
        const nepalPhoneRegex = /^(97|98|96)\d{8}$/;

        if (!nepalPhoneRegex.test(formData.phone)) {
            setError("Please enter a valid Nepal mobile number.");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(
                `${API_URL}/api/contact`,
                formData
            );

            if (res.data.success) {
                setSuccess(true);

                setFormData({
                    ...formData,
                    message: "",
                });
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to send message"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={s.container}>

            {user?.role !== "seller" && <Navbar />}

            <div className={s.mainContainer}>

                <div className={s.header}>
                    <h1 className={s.heading}>
                        Get In Touch
                    </h1>

                    <p className={s.subheading}>
                        Have questions or feedback? We'd love to hear from you.
                        Our team is here to help you with anything you need.
                    </p>
                </div>

                <div className={s.grid}>

                    {/* Contact Information */}
                    <div className={s.contactInfoContainer}>

                        <div className={s.contactInfoCard}>

                            <div
                                className={`${s.contactItem} ${s.contactItemMarginBottom}`}
                            >
                                <div className={s.contactIconWrapper}>
                                    <HiOutlineMail size={24} />
                                </div>

                                <div>
                                    <div className={s.contactTitle}>
                                        Email Us
                                    </div>

                                    <div className={s.contactDetail}>
                                        support@realestate.com
                                    </div>
                                </div>
                            </div>

                            <div className={s.contactItem}>

                                <div className={s.contactIconWrapperAlt}>
                                    <HiOutlinePhone size={24} />
                                </div>

                                <div>
                                    <div className={s.contactTitle}>
                                        Call Us
                                    </div>

                                    <div className={s.contactDetail}>
                                        +977 9881323889
                                    </div>
                                </div>

                            </div>

                        </div>

                        <div className={s.quickSupportCard}>

                            <h3 className={s.quickSupportTitle}>
                                Quick Support
                            </h3>

                            <p className={s.quickSupportText}>
                                Available 24/7 for our premium members.
                                Your satisfaction is our priority.
                            </p>

                        </div>

                    </div>

                    {/* Contact Form */}
                    <div className={s.formCard}>

                        {success ? (

                            <div className={s.successContainer}>

                                <HiOutlineCheckCircle
                                    size={64}
                                    className={s.successIcon}
                                />

                                <h2 className={s.successTitle}>
                                    Message Sent!
                                </h2>

                                <p className={s.successMessage}>
                                    Thank you for reaching out. We've received
                                    your message and will get back to you shortly.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSuccess(false);
                                        setError("");
                                    }}
                                    className={s.successButton}
                                >
                                    Send Another Message
                                </button>

                            </div>

                        ) : (

                            <form
                                onSubmit={handleSubmit}
                                className={s.form}
                            >

                                {/* Name and Email */}
                                <div className={s.formTwoColGrid}>

                                    {/* Name */}
                                    <div className={s.inputGroup}>

                                        <label className={s.label}>
                                            <HiOutlineUser
                                                size={16}
                                                className="mr-1"
                                            />
                                            Name
                                        </label>

                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Ram Karki"
                                            className={s.input}
                                        />

                                    </div>

                                    {/* Email */}
                                    <div className={s.inputGroup}>

                                        <label className={s.label}>
                                            <HiOutlineMail
                                                size={16}
                                                className="mr-1"
                                            />
                                            Email
                                        </label>

                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="example@gmail.com"
                                            className={s.input}
                                        />

                                    </div>

                                </div>

                                {/* Phone */}
                                <div className={s.inputGroup}>

                                    <label className={s.label}>
                                        <HiOutlinePhone
                                            size={16}
                                            className="mr-1"
                                        />
                                        Phone Number
                                    </label>

                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="9812345678"
                                        maxLength={10}
                                        className={s.input}
                                    />

                                </div>

                                {/* Message */}
                                <div className={s.inputGroup}>

                                    <label className={s.label}>
                                        Message
                                    </label>

                                    <textarea
                                        name="message"
                                        required
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Tell us how we can help..."
                                        className={s.input}
                                        rows={5}
                                    />

                                </div>

                                {/* Error */}
                                {error && (
                                    <p className="text-red-600 text-sm mt-2">
                                        {error}
                                    </p>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={s.successButton}
                                >
                                    {loading
                                        ? "Sending..."
                                        : "Send Message"}
                                </button>

                            </form>

                        )}

                    </div>

                </div>

            </div>

        </div>
    );
};

export default Contact;

