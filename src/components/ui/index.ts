/**
 * 디자인 시스템 UI 컴포넌트 배럴.
 *
 * 사용처는 개별 경로 대신 여기서 가져다 쓴다:
 *   import { Button, Table, Modal } from "@/components/ui";
 *
 * 컴포넌트를 추가하면 이 파일에도 등록할 것.
 */

export { AppShell } from "./AppShell";
export type { AppShellProps } from "./AppShell";

export { Avatar } from "./Avatar";
export type { AvatarProps, AvatarSize } from "./Avatar";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, CardHeader, CardBody, CardFooter } from "./Card";
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
} from "./Card";

export {
  BarChart,
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  DonutChart,
  LineChart,
  CHART_SERIES_COLORS,
  CHART_FILL_COLORS,
} from "./Chart";
export type {
  BarChartProps,
  ChartDatum,
  ChartFrameProps,
  ChartLegendProps,
  ChartSeries,
  DonutChartProps,
  LineChartProps,
} from "./Chart";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps, CheckboxSize } from "./Checkbox";

export { DataTableShell } from "./DataTableShell";
export type { DataTableShellProps } from "./DataTableShell";

export { DatePicker } from "./DatePicker";
export type {
  DatePickerProps,
  DatePickerSingleProps,
  DatePickerRangeProps,
  DatePickerMode,
  DateRange,
} from "./DatePicker";

export { Divider } from "./Divider";
export type { DividerProps, DividerOrientation, DividerTone } from "./Divider";

export {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from "./Dropdown";
export type {
  DropdownProps,
  DropdownSize,
  DropdownTriggerProps,
  DropdownMenuProps,
  DropdownItemProps,
  DropdownItemTone,
  DropdownItemRole,
  DropdownDividerProps,
} from "./Dropdown";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps, EmptyStateSize } from "./EmptyState";

export { FormField } from "./FormField";
export type { FormFieldProps, FormFieldOrientation } from "./FormField";

export { Gnb, GnbBadge } from "./Gnb";
export type {
  GnbProps,
  GnbSection,
  GnbMenuItem,
  GnbBadgeProps,
  GnbBadgeTone,
} from "./Gnb";

export { IconButton } from "./IconButton";
export type {
  IconButtonProps,
  IconButtonVariant,
  IconButtonSize,
} from "./IconButton";

export { Input, InputGroup, InputAttachedButton } from "./Input";
export type {
  InputProps,
  InputGroupProps,
  InputAttachedButtonProps,
} from "./Input";

export { InfoList, InfoItem } from "./InfoList";
export type { InfoListProps, InfoItemProps } from "./InfoList";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ConfirmModal,
} from "./Modal";
export type {
  ModalProps,
  ModalSize,
  ModalHeaderProps,
  ModalTitleProps,
  ModalDescriptionProps,
  ModalBodyProps,
  ModalFooterProps,
  ConfirmModalProps,
  ConfirmModalTone,
} from "./Modal";

export { ProgressBar } from "./ProgressBar";
export type { ProgressBarProps, ProgressBarTone } from "./ProgressBar";

export { Pagination, PaginationSizeSelect } from "./Pagination";
export type {
  PaginationProps,
  PaginationSizeSelectProps,
  PaginationItem,
  PaginationEllipsis,
  PaginationRangeOptions,
} from "./Pagination";

export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";

export { Radio, RadioGroup } from "./Radio";
export type {
  RadioProps,
  RadioSize,
  RadioGroupProps,
  RadioGroupOrientation,
} from "./Radio";

export { SegmentedControl } from "./SegmentedControl";
export type {
  SegmentedControlProps,
  SegmentedControlItem,
  SegmentedControlVariant,
  SegmentedControlFill,
  SegmentedControlSize,
} from "./SegmentedControl";

export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export {
  SelectionBar,
  SelectionBarButton,
  SelectionBarDivider,
} from "./SelectionBar";
export type {
  SelectionBarProps,
  SelectionBarButtonProps,
  SelectionBarDividerProps,
} from "./SelectionBar";

export {
  SideSheet,
  SideSheetHeader,
  SideSheetTitle,
  SideSheetDescription,
  SideSheetBody,
  SideSheetFooter,
} from "./SideSheet";
export type {
  SideSheetProps,
  SideSheetHeaderProps,
  SideSheetTitleProps,
  SideSheetDescriptionProps,
  SideSheetBodyProps,
  SideSheetFooterProps,
} from "./SideSheet";

export { Skeleton } from "./Skeleton";
export type { SkeletonProps, SkeletonShape } from "./Skeleton";

export { Spinner } from "./Spinner";
export type { SpinnerProps, SpinnerTone } from "./Spinner";

export { Switch } from "./Switch";
export type { SwitchProps, SwitchSize } from "./Switch";

export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "./Table";
export type {
  TableProps,
  TableHeadProps,
  TableBodyProps,
  TableRowProps,
  TableThProps,
  TableTdProps,
  TableAlign,
} from "./Table";

export { Tabs } from "./Tabs";
export type { TabsProps, TabItem } from "./Tabs";

export { Tag } from "./Tag";
export type { TagProps, TagTone, TagSize, TagCustomStyle } from "./Tag";

export { Textarea } from "./Textarea";
export type { TextareaProps, TextareaResize } from "./Textarea";

export { TextButton } from "./TextButton";
export type {
  TextButtonProps,
  TextButtonTone,
  TextButtonSize,
} from "./TextButton";

export { Tooltip } from "./Tooltip";
export type { TooltipProps, TooltipVariant, TooltipDelay } from "./Tooltip";

/* 대시보드 레이어 — 규격: docs/DESIGN-dashboard.md §D3 · §D4 */
export { StatTile } from "./StatTile";
export type { StatTileProps, StatTileVariant } from "./StatTile";

export { StatGrid } from "./StatGrid";
export type { StatGridProps, StatGridItem } from "./StatGrid";

export { Toast, ToastProvider, useToast } from "./Toast";
export type {
  ToastProps,
  ToastTone,
  ToastSize,
  ToastPosition,
  ToastProviderProps,
  ToastOptions,
  ToastInput,
  ToastContextValue,
} from "./Toast";
