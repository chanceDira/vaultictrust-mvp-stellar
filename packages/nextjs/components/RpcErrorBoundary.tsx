"use client";

import { Component, ReactNode } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Props = {
  children: ReactNode;
  label?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

export class RpcErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "unexpected error";
    return { hasError: true, message };
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-error/20 bg-error/5 p-6 text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-error/60 mx-auto mb-3" />
          <p className="font-semibold text-sm text-error/80 mb-1">{this.props.label ?? "section"} failed to load</p>
          <p className="text-xs text-base-content/40 mb-4 max-w-xs mx-auto">{this.state.message}</p>
          <button className="btn btn-sm btn-outline btn-error" onClick={this.reset}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
