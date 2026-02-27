import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import {
  generateOAuthState,
  verifyOAuthState,
  exchangeCodeForTokens,
  getSpotifyUserProfile,
  saveSpotifyConnection,
  getSpotifyConnection,
  deleteSpotifyConnection,
} from '../services/spotifyUserService';
import { AppError } from '../middleware/errorHandler';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const REQUIRED_SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
].join(' ');

export async function getAuthUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const { clientId, redirectUri } = config.spotify;

    if (!clientId) {
      return next(new AppError('Spotify integration not configured', 500));
    }

    const state = generateOAuthState(userId);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: REQUIRED_SCOPES,
      state,
    });

    const authUrl = `${SPOTIFY_AUTH_URL}?${params}`;

    res.json({
      success: true,
      data: { url: authUrl },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state, error } = req.query;

    // Build redirect URL to frontend
    const buildRedirectUrl = (success: boolean, errorMsg?: string) => {
      const params = new URLSearchParams();
      params.set('success', success.toString());
      if (errorMsg) {
        params.set('error', errorMsg);
      }
      return `${config.clientUrl}/spotify/callback?${params}`;
    };

    // Handle Spotify authorization errors
    if (error) {
      return res.redirect(buildRedirectUrl(false, error as string));
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(buildRedirectUrl(false, 'No authorization code received'));
    }

    if (!state || typeof state !== 'string') {
      return res.redirect(buildRedirectUrl(false, 'Invalid state parameter'));
    }

    // Verify state
    const stateResult = verifyOAuthState(state);
    if (!stateResult.valid || !stateResult.userId) {
      return res.redirect(buildRedirectUrl(false, 'Invalid or expired state'));
    }

    const userId = stateResult.userId;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get Spotify user profile
    const profile = await getSpotifyUserProfile(tokens.accessToken);

    // Save the connection
    saveSpotifyConnection(
      userId,
      profile.id,
      profile.display_name,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
      tokens.scopes
    );

    // Redirect to frontend with success
    res.redirect(buildRedirectUrl(true));
  } catch (error) {
    console.error('Spotify callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const redirectUrl = `${config.clientUrl}/spotify/callback?success=false&error=${encodeURIComponent(errorMessage)}`;
    res.redirect(redirectUrl);
  }
}

export async function getConnectionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const connection = getSpotifyConnection(userId);

    if (!connection) {
      return res.json({
        success: true,
        data: {
          connected: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        connected: true,
        spotifyUserId: connection.spotifyUserId,
        displayName: connection.displayName,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnect(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    deleteSpotifyConnection(userId);

    res.json({
      success: true,
      message: 'Spotify account disconnected',
    });
  } catch (error) {
    next(error);
  }
}
