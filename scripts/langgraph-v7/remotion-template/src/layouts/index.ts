import type { Theme } from '../theme';
import { TitleAndBody } from './TitleAndBody';
import { TitleBodyIllustration } from './TitleBodyIllustration';
import { CenteredDiagram } from './CenteredDiagram';
import { TwoColumn } from './TwoColumn';
import { Comparison } from './Comparison';
import { Grid3 } from './Grid3';
import { Grid4 } from './Grid4';
import { ProcessFlow } from './ProcessFlow';
import { StackedList } from './StackedList';
import { AnnotatedDiagram } from './AnnotatedDiagram';
import { TimelineHorizontal } from './TimelineHorizontal';
import { FullIllustration } from './FullIllustration';

export type LayoutProps = {
  theme: Theme;
  slots: Record<string, React.ReactNode>;
};

export const LAYOUTS: Record<string, React.FC<LayoutProps>> = {
  'title-and-body': TitleAndBody,
  'title-body-illustration': TitleBodyIllustration,
  'centered-diagram': CenteredDiagram,
  'two-column': TwoColumn,
  'comparison': Comparison,
  'grid-3': Grid3,
  'grid-4': Grid4,
  'process-flow': ProcessFlow,
  'stacked-list': StackedList,
  'annotated-diagram': AnnotatedDiagram,
  'timeline-horizontal': TimelineHorizontal,
  'full-illustration': FullIllustration,
};

export {
  TitleAndBody,
  TitleBodyIllustration,
  CenteredDiagram,
  TwoColumn,
  Comparison,
  Grid3,
  Grid4,
  ProcessFlow,
  StackedList,
  AnnotatedDiagram,
  TimelineHorizontal,
  FullIllustration,
};

export type { Theme } from '../theme';
