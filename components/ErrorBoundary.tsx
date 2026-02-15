import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-900 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full border border-red-200">
                        <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
                        <p className="mb-4">The application encountered an unexpected error.</p>

                        <div className="bg-gray-100 p-3 rounded mb-6 overflow-auto max-h-40 text-sm font-mono text-gray-700">
                            {this.state.error?.message || "Unknown error"}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
