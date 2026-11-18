
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSearchParams, Link } from "react-router-dom";
import API_URL from "../../config";

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying your payment...");
  const [success, setSuccess] = useState(false);
  const [booking, setBooking] = useState(null);
  const [propertyStatus, setPropertyStatus] = useState("");

  const verifiedPidx = useRef("");

  const pidx = searchParams.get("pidx");
  const paymentType = searchParams.get("paymentType") || "advance";

  const isRemainingPayment = paymentType === "remaining";

  useEffect(() => {
    let isMounted = true;

    const verifyPayment = async () => {
      try {
        if (!pidx) {
          setMessage("Payment ID (pidx) is missing.");
          setLoading(false);
          return;
        }

        if (!["advance", "remaining"].includes(paymentType)) {
          setMessage("Invalid payment type.");
          setLoading(false);
          return;
        }

        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          setMessage("Please log in to verify your payment.");
          setLoading(false);
          return;
        }

        if (verifiedPidx.current === pidx) return;

        verifiedPidx.current = pidx;

        const verificationEndpoint = isRemainingPayment
          ? `${API_URL}/api/booking/remaining/verify`
          : `${API_URL}/api/booking/verify`;

        const response = await axios.post(
          verificationEndpoint,
          { pidx },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!isMounted) return;

        if (response.data.success) {
          setSuccess(true);
          setBooking(response.data.booking || null);
          setPropertyStatus(response.data.propertyStatus || "");

          setMessage(
            response.data.message ||
              "Your payment was verified successfully."
          );
        } else {
          setSuccess(false);
          setMessage(
            response.data.message || "Payment verification failed."
          );
          verifiedPidx.current = "";
        }
      } catch (error) {
        console.error(
          "Payment verification error:",
          error.response?.data || error.message
        );

        if (!isMounted) return;

        setSuccess(false);
        setMessage(
          error.response?.data?.message ||
            "Unable to verify your payment. Please try again."
        );

        verifiedPidx.current = "";
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyPayment();

    return () => {
      isMounted = false;
    };
  }, [pidx, paymentType, isRemainingPayment]);

  const transactionId = isRemainingPayment
    ? booking?.remainingTransactionId
    : booking?.transactionId;

  const formatAmount = (amount) =>
    Number(amount || 0).toLocaleString("en-IN");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">

        {loading ? (
          <>
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-teal-600 border-t-transparent mx-auto mb-5"></div>

            <h2 className="text-xl font-semibold text-gray-800">
              Verifying Payment
            </h2>

            <p className="text-gray-500 mt-2">
              Please wait while we verify your Khalti payment.
            </p>
          </>
        ) : (
          <>
            <div
              className={`text-5xl mb-4 ${
                success ? "text-green-600" : "text-red-600"
              }`}
            >
              {success ? "✓" : "✕"}
            </div>

            <h2 className="text-2xl font-bold text-gray-800">
              {success
                ? isRemainingPayment
                  ? "Remaining Payment Verified"
                  : "Advance Payment Verified"
                : "Payment Verification Failed"}
            </h2>

            <p className="text-gray-600 mt-3">{message}</p>

            {booking && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4 text-left space-y-2">

                <p className="break-all">
                  <strong>Booking ID:</strong> {booking._id}
                </p>

                <p>
                  <strong>Total Property Price:</strong>{" "}
                  NPR {formatAmount(booking.totalPrice)}
                </p>

                <p>
                  <strong>Advance Amount:</strong>{" "}
                  NPR {formatAmount(booking.advanceAmount)}
                </p>

                <p>
                  <strong>Remaining Amount:</strong>{" "}
                  NPR {formatAmount(booking.remainingAmount)}
                </p>

                <p>
                  <strong>Booking Status:</strong>{" "}
                  {booking.bookingStatus}
                </p>

                <p>
                  <strong>
                    {isRemainingPayment
                      ? "Remaining Payment Status:"
                      : "Advance Payment Status:"}
                  </strong>{" "}
                  {isRemainingPayment
                    ? booking.remainingPaymentStatus
                    : booking.paymentStatus}
                </p>

                {transactionId && (
                  <p className="break-all">
                    <strong>Transaction ID:</strong> {transactionId}
                  </p>
                )}

                {propertyStatus && (
                  <p>
                    <strong>Property Status:</strong>{" "}
                    <span className="font-bold uppercase">
                      {propertyStatus}
                    </span>
                  </p>
                )}

                {booking.paymentMode === "sandbox" && (
                  <p className="text-orange-600 font-medium mt-3">
                    Sandbox test only. No real money was transferred.
                  </p>
                )}
              </div>
            )}

            {success && isRemainingPayment && propertyStatus === "sold" && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-green-700 font-semibold">
                ✓ Full payment completed! This property is now sold.
              </div>
            )}

            <Link
              to="/properties"
              className="inline-block mt-6 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Browse Properties
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentVerify;
