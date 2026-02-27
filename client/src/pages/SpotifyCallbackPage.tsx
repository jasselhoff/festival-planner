import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';

export function SpotifyCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      setStatus('success');
      // Redirect back after a short delay
      const timer = setTimeout(() => {
        // Try to go back, or go to groups page
        if (window.history.length > 2) {
          navigate(-2); // Go back past the Spotify auth page
        } else {
          navigate('/groups');
        }
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setStatus('error');
      setErrorMessage(error || 'Failed to connect Spotify account');
    }
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/groups');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-[#1DB954] mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to Spotify...
            </h1>
            <p className="text-gray-600">Please wait while we complete the connection.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Spotify Connected!
            </h1>
            <p className="text-gray-600 mb-4">
              Your Spotify account has been successfully linked.
            </p>
            <p className="text-sm text-gray-500">Redirecting you back...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h1>
            <p className="text-gray-600 mb-4">
              {errorMessage}
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Go to Groups
            </button>
          </>
        )}
      </div>
    </div>
  );
}
