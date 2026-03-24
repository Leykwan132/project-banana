import { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
    BottomSheetBackdrop,
    BottomSheetFlatList,
    BottomSheetModal,
    BottomSheetScrollView,
    BottomSheetView,
    type BottomSheetBackdropProps,
    type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';

interface AppBottomSheetProps extends Omit<BottomSheetModalProps, 'children' | 'index' | 'snapPoints' | 'backdropComponent' | 'onDismiss'> {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    snapPoints?: number[];
    backgroundColor?: string;
    indicatorColor?: string;
    hideHandle?: boolean;
    backgroundStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_SNAP_POINTS: number[] = [];
const DEFAULT_CONTENT_PADDING_BOTTOM = 48;

function withAddedBottomPadding(style: StyleProp<ViewStyle>, paddingBottom: number) {
    const flattenedStyle = StyleSheet.flatten(style);
    const currentPaddingBottom =
        typeof flattenedStyle?.paddingBottom === 'number' ? flattenedStyle.paddingBottom : 0;

    return [
        style,
        { paddingBottom: currentPaddingBottom + paddingBottom },
    ];
}

function addBottomPadding(children: ReactNode) {
    return Children.map(children, (child) => {
        if (!isValidElement(child)) {
            return child;
        }

        const element = child as ReactElement<{
            style?: StyleProp<ViewStyle>;
            contentContainerStyle?: StyleProp<ViewStyle>;
        }>;

        if ('contentContainerStyle' in element.props) {
            return cloneElement(element, {
                contentContainerStyle: withAddedBottomPadding(
                    element.props.contentContainerStyle,
                    DEFAULT_CONTENT_PADDING_BOTTOM,
                ),
            });
        }

        return cloneElement(element, {
            style: [
                element.props.style,
                { paddingBottom: DEFAULT_CONTENT_PADDING_BOTTOM },
            ],
        });
    });
}

export function AppBottomSheet({
    open,
    onClose,
    children,
    snapPoints,
    backgroundColor,
    indicatorColor,
    hideHandle = false,
    backgroundStyle,
    enableDynamicSizing = true,
    enablePanDownToClose = true,
    ...props
}: AppBottomSheetProps) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const hasMountedRef = useRef(false);
    const resolvedSnapPoints = useMemo(
        () => snapPoints ?? DEFAULT_SNAP_POINTS,
        [snapPoints],
    );

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            if (open) {
                bottomSheetRef.current?.present();
            }
            return;
        }

        if (open) {
            bottomSheetRef.current?.present();
            return;
        }

        bottomSheetRef.current?.dismiss();
    }, [open]);

    const renderBackdrop = useCallback(
        (backdropProps: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...backdropProps}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.45}
                pressBehavior="close"
            />
        ),
        [],
    );

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            snapPoints={resolvedSnapPoints}
            enableDynamicSizing={enableDynamicSizing}
            enablePanDownToClose={enablePanDownToClose}
            backdropComponent={renderBackdrop}
            handleComponent={hideHandle ? null : undefined}
            handleIndicatorStyle={hideHandle ? undefined : [{ backgroundColor: indicatorColor ?? '#D0D0D0' }]}
            backgroundStyle={[{ backgroundColor: backgroundColor ?? '#FFFFFF' }, backgroundStyle]}
            onDismiss={onClose}
            {...props}
        >
            {addBottomPadding(children)}
        </BottomSheetModal>
    );
}

export { BottomSheetFlatList, BottomSheetScrollView, BottomSheetView };
