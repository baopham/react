/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useCallback, useContext} from 'react';
import {TreeDispatcherContext, TreeStateContext} from './TreeContext';
import {BridgeContext, StoreContext} from '../context';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {ModalDialogContext} from '../ModalDialog';
import ViewElementSourceContext from './ViewElementSourceContext';
import Toggle from '../Toggle';
import {ElementTypeSuspense} from 'react-devtools-shared/src/types';
import CannotThrowWarningMessage from './CannotThrowWarningMessage';
import CannotSuspendWarningMessage from './CannotSuspendWarningMessage';
import InspectedElementView from './InspectedElementView';
import {InspectedElementContext} from './InspectedElementContext';

import styles from './InspectedElement.css';

import type {InspectedElement} from './types';

export type Props = {||};

// TODO Make edits and deletes also use transition API!

export default function InspectedElementWrapper(_: Props) {
  const {inspectedElementID} = useContext(TreeStateContext);
  const dispatch = useContext(TreeDispatcherContext);
  const {canViewElementSourceFunction, viewElementSourceFunction} = useContext(
    ViewElementSourceContext,
  );
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);
  const {dispatch: modalDialogDispatch} = useContext(ModalDialogContext);

  const {inspectedElement} = useContext(InspectedElementContext);

  const element =
    inspectedElementID !== null
      ? store.getElementByID(inspectedElementID)
      : null;

  const highlightElement = useCallback(() => {
    if (element !== null && inspectedElementID !== null) {
      const rendererID = store.getRendererIDForElement(inspectedElementID);
      if (rendererID !== null) {
        bridge.send('highlightNativeElement', {
          displayName: element.displayName,
          hideAfterTimeout: true,
          id: inspectedElementID,
          openNativeElementsPanel: true,
          rendererID,
          scrollIntoView: true,
        });
      }
    }
  }, [bridge, element, inspectedElementID, store]);

  const logElement = useCallback(() => {
    if (inspectedElementID !== null) {
      const rendererID = store.getRendererIDForElement(inspectedElementID);
      if (rendererID !== null) {
        bridge.send('logElementToConsole', {
          id: inspectedElementID,
          rendererID,
        });
      }
    }
  }, [bridge, inspectedElementID, store]);

  const viewSource = useCallback(() => {
    if (viewElementSourceFunction != null && inspectedElement !== null) {
      viewElementSourceFunction(
        inspectedElement.id,
        ((inspectedElement: any): InspectedElement),
      );
    }
  }, [inspectedElement, viewElementSourceFunction]);

  // In some cases (e.g. FB internal usage) the standalone shell might not be able to view the source.
  // To detect this case, we defer to an injected helper function (if present).
  const canViewSource =
    inspectedElement !== null &&
    inspectedElement.canViewSource &&
    viewElementSourceFunction !== null &&
    (canViewElementSourceFunction === null ||
      canViewElementSourceFunction(inspectedElement));

  const isErrored =
    inspectedElement != null && inspectedElement.isErrored;

  const isSuspended =
    element !== null &&
    element.type === ElementTypeSuspense &&
    inspectedElement != null &&
    inspectedElement.state != null;

  const canToggleError =
    inspectedElement != null && inspectedElement.canToggleError;

  const canToggleSuspense =
    inspectedElement != null && inspectedElement.canToggleSuspense;

  const toggleErrored = useCallback(() => {
    let nearestErrorBoundary = null;
    let currentElement = element;
    while (currentElement !== null) {
      if (currentElement.isErrorBoundary) {
        nearestErrorBoundary = currentElement;
        break;
      } else if (currentElement.parentID > 0) {
        currentElement = store.getElementByID(currentElement.parentID);
      } else {
        currentElement = null;
      }
    }

    // If we didn't find an error boundary ancestor, we can't throw.
    // Instead we can show a warning to the user.
    if (nearestErrorBoundary === null) {
      modalDialogDispatch({
        type: 'SHOW',
        content: <CannotThrowWarningMessage />,
      })
    } else {
      const nearestErrorBoundaryID = nearestErrorBoundary.id;

      if (nearestErrorBoundary !== element) {
        dispatch({
          type: 'SELECT_ELEMENT_BY_ID',
          payload: nearestErrorBoundaryID,
        });
      }

      const rendererID = store.getRendererIDForElement(nearestErrorBoundaryID);

      // Toggle error.
      if (rendererID !== null) {
        bridge.send('overrideError', {
          id: nearestErrorBoundaryID,
          rendererID,
          forceError: !isErrored,
        });
      }
    }
  }, [bridge, dispatch, element, isErrored, modalDialogDispatch, store]);

  // TODO (suspense toggle) Would be nice to eventually use a two setState pattern here as well.
  const toggleSuspended = useCallback(() => {
    let nearestSuspenseElement = null;
    let currentElement = element;
    while (currentElement !== null) {
      if (currentElement.type === ElementTypeSuspense) {
        nearestSuspenseElement = currentElement;
        break;
      } else if (currentElement.parentID > 0) {
        currentElement = store.getElementByID(currentElement.parentID);
      } else {
        currentElement = null;
      }
    }

    // If we didn't find a Suspense ancestor, we can't suspend.
    // Instead we can show a warning to the user.
    if (nearestSuspenseElement === null) {
      modalDialogDispatch({
        id: 'InspectedElement',
        type: 'SHOW',
        content: <CannotSuspendWarningMessage />,
      });
    } else {
      const nearestSuspenseElementID = nearestSuspenseElement.id;

      // If we're suspending from an arbitrary (non-Suspense) component, select the nearest Suspense element in the Tree.
      // This way when the fallback UI is shown and the current element is hidden, something meaningful is selected.
      if (nearestSuspenseElement !== element) {
        dispatch({
          type: 'SELECT_ELEMENT_BY_ID',
          payload: nearestSuspenseElementID,
        });
      }

      const rendererID = store.getRendererIDForElement(
        nearestSuspenseElementID,
      );

      // Toggle suspended
      if (rendererID !== null) {
        bridge.send('overrideSuspense', {
          id: nearestSuspenseElementID,
          rendererID,
          forceFallback: !isSuspended,
        });
      }
    }
  }, [bridge, dispatch, element, isSuspended, modalDialogDispatch, store]);

  if (element === null) {
    return (
      <div className={styles.InspectedElement}>
        <div className={styles.TitleRow} />
      </div>
    );
  }

  return (
    <div className={styles.InspectedElement}>
      <div className={styles.TitleRow}>
        {element.key && (
          <>
            <div className={styles.Key} title={`key "${element.key}"`}>
              {element.key}
            </div>
            <div className={styles.KeyArrow} />
          </>
        )}

        <div className={styles.SelectedComponentName}>
          <div className={styles.Component} title={element.displayName}>
            {element.displayName}
          </div>
        </div>

        {canToggleError && (
          <Toggle
            className={styles.IconButton}
            isChecked={isErrored}
            onChange={toggleErrored}
            title={
              isErrored
                ? 'Clear the forced error'
                : 'Force the selected component into an errored state'
            }>
            <ButtonIcon type="error" />
          </Toggle>
        )}
        {canToggleSuspense && (
          <Toggle
            className={styles.IconButton}
            isChecked={isSuspended}
            onChange={toggleSuspended}
            title={
              isSuspended
                ? 'Unsuspend the selected component'
                : 'Suspend the selected component'
            }>
            <ButtonIcon type="suspend" />
          </Toggle>
        )}
        {store.supportsNativeInspection && (
          <Button
            className={styles.IconButton}
            onClick={highlightElement}
            title="Inspect the matching DOM element">
            <ButtonIcon type="view-dom" />
          </Button>
        )}
        <Button
          className={styles.IconButton}
          onClick={logElement}
          title="Log this component data to the console">
          <ButtonIcon type="log-data" />
        </Button>
        <Button
          className={styles.IconButton}
          disabled={!canViewSource}
          onClick={viewSource}
          title="View source for this element">
          <ButtonIcon type="view-source" />
        </Button>
      </div>

      {inspectedElement === null && (
        <div className={styles.Loading}>Loading...</div>
      )}

      {inspectedElement !== null && (
        <InspectedElementView
          key={
            inspectedElementID /* Force reset when selected Element changes */
          }
          element={element}
          inspectedElement={inspectedElement}
        />
      )}
    </div>
  );
}
