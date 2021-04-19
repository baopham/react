/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment} from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    //
  }

  render() {
    if (this.state.hasError) {
      return <strong style={{color:'red'}}>Something went wrong.</strong>;
    }

    return this.props.children;
  }
}

function Bomb() {
  throw new Error('💥 CABOOM 💥');
}

function ComponentThatMayError(props) {
  return (
    <div>
      <p>Component that may error</p>
      {!!props.hasBomb && <Bomb />}
    </div>
  );
}

export default function ErrorBoundaries() {
  return (
    <Fragment>
      <h1>Error Boundaries</h1>
      <Fragment>
        <h3>No initial error</h3>
        <ErrorBoundary>
          <ComponentThatMayError hasBomb={false} />
        </ErrorBoundary>
      </Fragment>
      {/* <Fragment> */}
      {/*   <h3>Has initial error</h3> */}
      {/*   <ErrorBoundary> */}
      {/*     <ComponentThatMayError hasBomb={true} /> */}
      {/*   </ErrorBoundary> */}
      {/* </Fragment> */}
    </Fragment>
  );
}

