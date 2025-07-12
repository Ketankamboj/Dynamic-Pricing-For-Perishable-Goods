import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

// Action types
const ActionTypes = {
  USER_LOADED: 'USER_LOADED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAIL: 'REGISTER_FAIL',
  LOGOUT: 'LOGOUT',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  SET_LOADING: 'SET_LOADING',
  UPDATE_PROFILE: 'UPDATE_PROFILE'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
        error: null
      };
    case ActionTypes.LOGIN_SUCCESS:
    case ActionTypes.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case ActionTypes.LOGIN_FAIL:
    case ActionTypes.REGISTER_FAIL:
    case ActionTypes.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: action.payload
      };
    case ActionTypes.CLEAR_ERRORS:
      return {
        ...state,
        error: null
      };
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case ActionTypes.UPDATE_PROFILE:
      return {
        ...state,
        user: action.payload
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on component mount
  useEffect(() => {
    if (state.token) {
      loadUser();
    } else {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []);

  // Load user from token
  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      dispatch({
        type: ActionTypes.USER_LOADED,
        payload: response.data.data.user
      });
    } catch (error) {
      console.error('Load user error:', error);
      dispatch({
        type: ActionTypes.LOGIN_FAIL,
        payload: error.response?.data?.message || 'Failed to load user'
      });
    }
  };

  // Register user
  const register = async (userData) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    try {
      const response = await api.post('/auth/register', userData);
      dispatch({
        type: ActionTypes.REGISTER_SUCCESS,
        payload: response.data.data
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: ActionTypes.REGISTER_FAIL,
        payload: message
      });
      return { success: false, error: message };
    }
  };

  // Login user
  const login = async (credentials) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    try {
      const response = await api.post('/auth/login', credentials);
      dispatch({
        type: ActionTypes.LOGIN_SUCCESS,
        payload: response.data.data
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({
        type: ActionTypes.LOGIN_FAIL,
        payload: message
      });
      return { success: false, error: message };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: ActionTypes.LOGOUT });
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      dispatch({
        type: ActionTypes.UPDATE_PROFILE,
        payload: response.data.data.user
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: message };
    }
  };

  // Clear errors
  const clearErrors = () => {
    dispatch({ type: ActionTypes.CLEAR_ERRORS });
  };

  const value = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    clearErrors,
    loadUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
