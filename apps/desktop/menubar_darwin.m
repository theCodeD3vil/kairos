#import <Cocoa/Cocoa.h>
#import <Foundation/Foundation.h>
#import <stdlib.h>
#import <string.h>

extern void kairosMenubarShow(void);
extern void kairosMenubarQuit(void);
extern const char *kairosMenubarSnapshotJSON(void);
extern void kairosMenubarFreeCString(const char *value);

static NSStatusItem *kairosStatusItem = nil;

static NSColor *KairosSurfaceColor(void) {
  return [NSColor colorWithCalibratedRed:0.93 green:0.94 blue:0.93 alpha:1.0];
}

static NSColor *KairosPanelColor(void) {
  return [NSColor colorWithCalibratedRed:0.96 green:0.97 blue:0.96 alpha:1.0];
}

static NSColor *KairosInkColor(void) {
  return [NSColor colorWithCalibratedRed:0.11 green:0.15 blue:0.19 alpha:1.0];
}

static NSColor *KairosMutedInkColor(void) {
  return [NSColor colorWithCalibratedRed:0.38 green:0.45 blue:0.49 alpha:1.0];
}

static NSColor *KairosAccentColor(void) {
  return [NSColor colorWithCalibratedRed:0.11 green:0.74 blue:0.41 alpha:1.0];
}

static NSColor *KairosDarkSurfaceColor(void) {
  return [NSColor colorWithCalibratedRed:0.08 green:0.10 blue:0.12 alpha:1.0];
}

static NSColor *KairosDarkPanelColor(void) {
  return [NSColor colorWithCalibratedRed:0.12 green:0.15 blue:0.18 alpha:1.0];
}

static NSColor *KairosDarkInkColor(void) {
  return [NSColor colorWithCalibratedRed:0.90 green:0.93 blue:0.95 alpha:1.0];
}

static NSColor *KairosDarkMutedInkColor(void) {
  return [NSColor colorWithCalibratedRed:0.63 green:0.70 blue:0.75 alpha:1.0];
}

static NSColor *KairosDarkTimelineBackgroundColor(void) {
  return [NSColor colorWithCalibratedRed:0.10 green:0.18 blue:0.15 alpha:1.0];
}

@interface KairosFlippedView : NSView
@end

@implementation KairosFlippedView
- (BOOL)isFlipped {
  return YES;
}
@end

@interface KairosTimelineView : NSView
@property(nonatomic, copy) NSArray<NSNumber *> *points;
@property(nonatomic, strong) NSColor *lineColor;
@property(nonatomic, strong) NSColor *lineMutedColor;
@property(nonatomic, strong) NSColor *fillColor;
@end

@implementation KairosTimelineView
- (instancetype)initWithFrame:(NSRect)frame {
  self = [super initWithFrame:frame];
  if (self) {
    _points = @[];
    _lineColor = KairosAccentColor();
    _lineMutedColor = KairosMutedInkColor();
    _fillColor = [KairosAccentColor() colorWithAlphaComponent:0.20];
    self.wantsLayer = YES;
    self.layer.backgroundColor = [[NSColor colorWithCalibratedRed:0.92 green:0.95 blue:0.93 alpha:1.0] CGColor];
    self.layer.cornerRadius = 10.0;
  }
  return self;
}

- (BOOL)isFlipped {
  return YES;
}

- (void)drawRect:(NSRect)dirtyRect {
  [super drawRect:dirtyRect];

  NSRect bounds = NSInsetRect(self.bounds, 8.0, 8.0);
  if (bounds.size.width <= 2.0 || bounds.size.height <= 2.0) {
    return;
  }

  NSInteger count = self.points.count;
  if (count < 2) {
    [[self.lineMutedColor colorWithAlphaComponent:0.35] setStroke];
    NSBezierPath *flat = [NSBezierPath bezierPath];
    [flat moveToPoint:NSMakePoint(bounds.origin.x, NSMidY(bounds))];
    [flat lineToPoint:NSMakePoint(NSMaxX(bounds), NSMidY(bounds))];
    flat.lineWidth = 1.5;
    [flat stroke];
    return;
  }

  CGFloat maxValue = 1.0;
  for (NSNumber *point in self.points) {
    maxValue = MAX(maxValue, point.floatValue);
  }

  NSBezierPath *line = [NSBezierPath bezierPath];
  NSBezierPath *fill = [NSBezierPath bezierPath];
  CGFloat step = bounds.size.width / (CGFloat)(count - 1);

  for (NSInteger index = 0; index < count; index++) {
    CGFloat value = self.points[index].floatValue;
    CGFloat normalized = value / maxValue;
    CGFloat x = bounds.origin.x + step * (CGFloat)index;
    CGFloat y = bounds.origin.y + bounds.size.height - (bounds.size.height * normalized);
    NSPoint point = NSMakePoint(x, y);

    if (index == 0) {
      [line moveToPoint:point];
      [fill moveToPoint:NSMakePoint(x, NSMaxY(bounds))];
      [fill lineToPoint:point];
    } else {
      [line lineToPoint:point];
      [fill lineToPoint:point];
    }
  }

  [fill lineToPoint:NSMakePoint(bounds.origin.x + step * (CGFloat)(count - 1), NSMaxY(bounds))];
  [fill closePath];

  [self.fillColor setFill];
  [fill fill];

  [self.lineColor setStroke];
  line.lineWidth = 2.0;
  line.lineCapStyle = NSLineCapStyleRound;
  line.lineJoinStyle = NSLineJoinStyleRound;
  [line stroke];
}
@end

@interface KairosMenubarContentController : NSViewController
@property(nonatomic, strong) NSView *rootView;
@property(nonatomic, strong) NSMutableArray<NSView *> *cardViews;
@property(nonatomic, strong) NSMutableArray<NSTextField *> *primaryLabels;
@property(nonatomic, strong) NSMutableArray<NSTextField *> *mutedLabels;
@property(nonatomic, strong) NSButton *openDesktopButton;
@property(nonatomic, strong) NSButton *quitButton;
@property(nonatomic, copy) NSString *themeMode;
@property(nonatomic, strong) NSTextField *clockLabel;
@property(nonatomic, strong) NSTextField *todayValueLabel;
@property(nonatomic, strong) NSTextField *weekValueLabel;
@property(nonatomic, strong) NSTextField *sessionCountLabel;
@property(nonatomic, strong) NSTextField *averageValueLabel;
@property(nonatomic, strong) NSTextField *currentSessionDurationLabel;
@property(nonatomic, strong) NSTextField *currentSessionProjectLabel;
@property(nonatomic, strong) NSTextField *currentSessionTimeLabel;
@property(nonatomic, strong) KairosTimelineView *timelineView;
@property(nonatomic, strong) NSTimer *refreshTimer;
- (void)refreshSnapshot;
- (void)startAutoRefresh;
- (void)stopAutoRefresh;
- (void)applyTheme;
@end

@implementation KairosMenubarContentController

- (void)loadView {
  NSView *root = [[KairosFlippedView alloc] initWithFrame:NSMakeRect(0, 0, 380, 440)];
  self.rootView = root;
  self.cardViews = [NSMutableArray array];
  self.primaryLabels = [NSMutableArray array];
  self.mutedLabels = [NSMutableArray array];
  self.themeMode = @"system";
  root.wantsLayer = YES;
  root.layer.backgroundColor = [KairosSurfaceColor() CGColor];
  self.view = root;

  NSView *header = [[NSView alloc] initWithFrame:NSMakeRect(16, 16, 348, 32)];
  header.wantsLayer = NO;
  [root addSubview:header];

  NSTextField *title = [self labelWithString:@"Kairos" size:20 weight:NSFontWeightSemibold color:KairosInkColor()];
  [self.primaryLabels addObject:title];
  title.frame = NSMakeRect(0, 0, 220, 32);
  [header addSubview:title];

  self.clockLabel = [self labelWithString:@"--:--" size:14 weight:NSFontWeightMedium color:KairosMutedInkColor()];
  [self.mutedLabels addObject:self.clockLabel];
  self.clockLabel.alignment = NSTextAlignmentRight;
  self.clockLabel.frame = NSMakeRect(220, 4, 128, 24);
  [header addSubview:self.clockLabel];

  NSView *currentCard = [self cardViewWithFrame:NSMakeRect(16, 56, 348, 100)];
  [self.cardViews addObject:currentCard];
  [root addSubview:currentCard];

  NSTextField *currentTitle = [self labelWithString:@"Current Session" size:12 weight:NSFontWeightSemibold color:KairosMutedInkColor()];
  [self.mutedLabels addObject:currentTitle];
  currentTitle.frame = NSMakeRect(14, 10, 320, 18);
  [currentCard addSubview:currentTitle];

  self.currentSessionDurationLabel = [self labelWithString:@"0m" size:28 weight:NSFontWeightSemibold color:KairosInkColor()];
  [self.primaryLabels addObject:self.currentSessionDurationLabel];
  self.currentSessionDurationLabel.frame = NSMakeRect(14, 30, 120, 38);
  [currentCard addSubview:self.currentSessionDurationLabel];

  self.currentSessionProjectLabel = [self labelWithString:@"No active session yet" size:13 weight:NSFontWeightMedium color:KairosMutedInkColor()];
  [self.mutedLabels addObject:self.currentSessionProjectLabel];
  self.currentSessionProjectLabel.frame = NSMakeRect(140, 40, 194, 22);
  [currentCard addSubview:self.currentSessionProjectLabel];

  self.currentSessionTimeLabel = [self labelWithString:@"--:-- → --:--" size:12 weight:NSFontWeightRegular color:KairosMutedInkColor()];
  [self.mutedLabels addObject:self.currentSessionTimeLabel];
  self.currentSessionTimeLabel.frame = NSMakeRect(140, 63, 194, 18);
  [currentCard addSubview:self.currentSessionTimeLabel];

  NSView *metricsRow = [[NSView alloc] initWithFrame:NSMakeRect(16, 166, 348, 88)];
  [root addSubview:metricsRow];

  NSView *todayCard = [self cardViewWithFrame:NSMakeRect(0, 0, 110, 88)];
  [self.cardViews addObject:todayCard];
  [metricsRow addSubview:todayCard];
  NSTextField *todayTitle = [self labelWithString:@"Today" size:11 weight:NSFontWeightSemibold color:KairosMutedInkColor()];
  [self.mutedLabels addObject:todayTitle];
  todayTitle.frame = NSMakeRect(12, 10, 86, 18);
  [todayCard addSubview:todayTitle];
  self.todayValueLabel = [self labelWithString:@"0m" size:22 weight:NSFontWeightSemibold color:KairosInkColor()];
  [self.primaryLabels addObject:self.todayValueLabel];
  self.todayValueLabel.frame = NSMakeRect(12, 32, 86, 34);
  [todayCard addSubview:self.todayValueLabel];

  NSView *weekCard = [self cardViewWithFrame:NSMakeRect(119, 0, 110, 88)];
  [self.cardViews addObject:weekCard];
  [metricsRow addSubview:weekCard];
  NSTextField *weekTitle = [self labelWithString:@"This Week" size:11 weight:NSFontWeightSemibold color:KairosMutedInkColor()];
  [self.mutedLabels addObject:weekTitle];
  weekTitle.frame = NSMakeRect(12, 10, 86, 18);
  [weekCard addSubview:weekTitle];
  self.weekValueLabel = [self labelWithString:@"0m" size:22 weight:NSFontWeightSemibold color:KairosInkColor()];
  [self.primaryLabels addObject:self.weekValueLabel];
  self.weekValueLabel.frame = NSMakeRect(12, 32, 86, 34);
  [weekCard addSubview:self.weekValueLabel];

  NSView *avgCard = [self cardViewWithFrame:NSMakeRect(238, 0, 110, 88)];
  [self.cardViews addObject:avgCard];
  [metricsRow addSubview:avgCard];
  NSTextField *avgTitle = [self labelWithString:@"Avg Session" size:11 weight:NSFontWeightSemibold color:KairosMutedInkColor()];
  [self.mutedLabels addObject:avgTitle];
  avgTitle.frame = NSMakeRect(12, 10, 86, 18);
  [avgCard addSubview:avgTitle];
  self.averageValueLabel = [self labelWithString:@"0m" size:22 weight:NSFontWeightSemibold color:KairosInkColor()];
  [self.primaryLabels addObject:self.averageValueLabel];
  self.averageValueLabel.frame = NSMakeRect(12, 32, 86, 34);
  [avgCard addSubview:self.averageValueLabel];

  self.sessionCountLabel = [self labelWithString:@"0 sessions this week" size:12 weight:NSFontWeightMedium color:KairosMutedInkColor()];
  [self.mutedLabels addObject:self.sessionCountLabel];
  self.sessionCountLabel.frame = NSMakeRect(16, 258, 348, 18);
  [root addSubview:self.sessionCountLabel];

  NSTextField *timelineLabel = [self labelWithString:@"Timeline" size:12 weight:NSFontWeightSemibold color:KairosMutedInkColor()];
  [self.mutedLabels addObject:timelineLabel];
  timelineLabel.frame = NSMakeRect(16, 280, 180, 18);
  [root addSubview:timelineLabel];

  self.timelineView = [[KairosTimelineView alloc] initWithFrame:NSMakeRect(16, 302, 348, 84)];
  [root addSubview:self.timelineView];

  self.openDesktopButton = [NSButton buttonWithTitle:@"Open Desktop" target:self action:@selector(openDesktopPressed:)];
  self.openDesktopButton.frame = NSMakeRect(16, 396, 168, 30);
  self.openDesktopButton.bezelStyle = NSBezelStyleRounded;
  [root addSubview:self.openDesktopButton];

  self.quitButton = [NSButton buttonWithTitle:@"Quit" target:self action:@selector(quitPressed:)];
  self.quitButton.frame = NSMakeRect(196, 396, 168, 30);
  self.quitButton.bezelStyle = NSBezelStyleRounded;
  [root addSubview:self.quitButton];

  [self applyTheme];
}

- (NSTextField *)labelWithString:(NSString *)text size:(CGFloat)size weight:(NSFontWeight)weight color:(NSColor *)color {
  NSTextField *label = [NSTextField labelWithString:text];
  label.font = [NSFont systemFontOfSize:size weight:weight];
  label.textColor = color;
  label.editable = NO;
  label.selectable = NO;
  label.drawsBackground = NO;
  label.bezeled = NO;
  label.lineBreakMode = NSLineBreakByTruncatingTail;
  return label;
}

- (NSView *)cardViewWithFrame:(NSRect)frame {
  NSView *card = [[NSView alloc] initWithFrame:frame];
  card.wantsLayer = YES;
  card.layer.backgroundColor = [KairosPanelColor() CGColor];
  card.layer.cornerRadius = 12.0;
  return card;
}

- (NSDictionary *)loadSnapshot {
  const char *snapshotJSON = kairosMenubarSnapshotJSON();
  if (snapshotJSON == NULL) {
    return nil;
  }

  NSData *data = [NSData dataWithBytes:snapshotJSON length:strlen(snapshotJSON)];
  kairosMenubarFreeCString(snapshotJSON);
  if (data.length == 0) {
    return nil;
  }

  NSError *parseError = nil;
  NSDictionary *payload = [NSJSONSerialization JSONObjectWithData:data options:0 error:&parseError];
  if (parseError != nil || ![payload isKindOfClass:[NSDictionary class]]) {
    return nil;
  }
  return payload;
}

- (void)refreshSnapshot {
  NSDictionary *snapshot = [self loadSnapshot];
  if (snapshot == nil) {
    return;
  }

  NSString *themeMode = snapshot[@"themeMode"];
  if ([themeMode isKindOfClass:[NSString class]] && ![self.themeMode isEqualToString:themeMode]) {
    self.themeMode = themeMode;
    [self applyTheme];
  }

  NSString *clock = snapshot[@"now"];
  if ([clock isKindOfClass:[NSString class]]) {
    self.clockLabel.stringValue = clock;
  }

  NSString *today = snapshot[@"todayLabel"];
  if ([today isKindOfClass:[NSString class]]) {
    self.todayValueLabel.stringValue = today;
  }

  NSString *week = snapshot[@"weekLabel"];
  if ([week isKindOfClass:[NSString class]]) {
    self.weekValueLabel.stringValue = week;
  }

  NSString *average = snapshot[@"averageLabel"];
  if ([average isKindOfClass:[NSString class]]) {
    self.averageValueLabel.stringValue = average;
  }

  NSNumber *sessionCount = snapshot[@"sessionCount"];
  if ([sessionCount isKindOfClass:[NSNumber class]]) {
    self.sessionCountLabel.stringValue = [NSString stringWithFormat:@"%@ sessions this week", sessionCount];
  }

  NSDictionary *current = snapshot[@"currentSession"];
  if ([current isKindOfClass:[NSDictionary class]]) {
    NSString *duration = current[@"durationLabel"];
    NSString *project = current[@"project"];
    NSString *language = current[@"language"];
    NSString *start = current[@"startLabel"];
    NSString *end = current[@"endLabel"];

    self.currentSessionDurationLabel.stringValue = [duration isKindOfClass:[NSString class]] ? duration : @"0m";
    if ([project isKindOfClass:[NSString class]] && [language isKindOfClass:[NSString class]]) {
      self.currentSessionProjectLabel.stringValue = [NSString stringWithFormat:@"%@ · %@", project, language];
    } else {
      self.currentSessionProjectLabel.stringValue = @"No active session yet";
    }
    if ([start isKindOfClass:[NSString class]] && [end isKindOfClass:[NSString class]]) {
      self.currentSessionTimeLabel.stringValue = [NSString stringWithFormat:@"%@ → %@", start, end];
    } else {
      self.currentSessionTimeLabel.stringValue = @"--:-- → --:--";
    }
  } else {
    self.currentSessionDurationLabel.stringValue = @"0m";
    self.currentSessionProjectLabel.stringValue = @"No active session yet";
    self.currentSessionTimeLabel.stringValue = @"--:-- → --:--";
  }

  NSArray *timeline = snapshot[@"timeline"];
  NSMutableArray<NSNumber *> *points = [NSMutableArray array];
  if ([timeline isKindOfClass:[NSArray class]]) {
    for (id item in timeline) {
      if (![item isKindOfClass:[NSDictionary class]]) {
        continue;
      }
      NSNumber *minutes = item[@"minutes"];
      if ([minutes isKindOfClass:[NSNumber class]]) {
        [points addObject:minutes];
      }
    }
  }
  self.timelineView.points = points;
  [self.timelineView setNeedsDisplay:YES];
}

- (void)applyTheme {
  BOOL darkTheme = NO;
  if ([self.themeMode isEqualToString:@"dark"]) {
    darkTheme = YES;
  } else if ([self.themeMode isEqualToString:@"light"]) {
    darkTheme = NO;
  } else {
    NSString *appearance = [self.view.effectiveAppearance bestMatchFromAppearancesWithNames:@[NSAppearanceNameAqua, NSAppearanceNameDarkAqua]];
    darkTheme = [appearance isEqualToString:NSAppearanceNameDarkAqua];
  }

  NSColor *surface = darkTheme ? KairosDarkSurfaceColor() : KairosSurfaceColor();
  NSColor *panel = darkTheme ? KairosDarkPanelColor() : KairosPanelColor();
  NSColor *ink = darkTheme ? KairosDarkInkColor() : KairosInkColor();
  NSColor *mutedInk = darkTheme ? KairosDarkMutedInkColor() : KairosMutedInkColor();
  NSColor *timelineBackground = darkTheme ? KairosDarkTimelineBackgroundColor() : [NSColor colorWithCalibratedRed:0.92 green:0.95 blue:0.93 alpha:1.0];

  self.rootView.layer.backgroundColor = surface.CGColor;
  for (NSView *card in self.cardViews) {
    card.layer.backgroundColor = panel.CGColor;
  }
  self.timelineView.layer.backgroundColor = timelineBackground.CGColor;
  self.timelineView.lineColor = KairosAccentColor();
  self.timelineView.lineMutedColor = mutedInk;
  self.timelineView.fillColor = [KairosAccentColor() colorWithAlphaComponent:darkTheme ? 0.28 : 0.20];
  [self.timelineView setNeedsDisplay:YES];

  for (NSTextField *label in self.primaryLabels) {
    label.textColor = ink;
  }
  for (NSTextField *label in self.mutedLabels) {
    label.textColor = mutedInk;
  }

  NSDictionary *buttonAttributes = @{
    NSFontAttributeName: [NSFont systemFontOfSize:13 weight:NSFontWeightSemibold],
    NSForegroundColorAttributeName: ink,
  };
  self.openDesktopButton.attributedTitle = [[NSAttributedString alloc] initWithString:@"Open Desktop" attributes:buttonAttributes];
  self.quitButton.attributedTitle = [[NSAttributedString alloc] initWithString:@"Quit" attributes:buttonAttributes];
}

- (void)startAutoRefresh {
  [self stopAutoRefresh];
  self.refreshTimer = [NSTimer scheduledTimerWithTimeInterval:20.0
                                                       target:self
                                                     selector:@selector(refreshSnapshot)
                                                     userInfo:nil
                                                      repeats:YES];
}

- (void)stopAutoRefresh {
  if (self.refreshTimer != nil) {
    [self.refreshTimer invalidate];
    self.refreshTimer = nil;
  }
}

- (void)openDesktopPressed:(id)sender {
  kairosMenubarShow();
}

- (void)quitPressed:(id)sender {
  kairosMenubarQuit();
}

@end

@interface KairosMenubarTarget : NSObject <NSPopoverDelegate>
@property(nonatomic, strong) NSPopover *popover;
@property(nonatomic, strong) KairosMenubarContentController *contentController;
- (void)togglePopover:(id)sender;
- (void)configurePopoverWindowForActiveSpace;
@end

@implementation KairosMenubarTarget
- (void)togglePopover:(id)sender {
  if (kairosStatusItem == nil || kairosStatusItem.button == nil) {
    return;
  }

  if (self.popover.shown) {
    [self.popover performClose:sender];
    return;
  }

  // Ensure the popover view hierarchy exists before the first snapshot write.
  [self.contentController loadViewIfNeeded];
  [self.contentController refreshSnapshot];
  [self.contentController startAutoRefresh];
  [self.popover showRelativeToRect:kairosStatusItem.button.bounds
                            ofView:kairosStatusItem.button
                     preferredEdge:NSRectEdgeMinY];
  [self configurePopoverWindowForActiveSpace];
  // Run one more refresh on the next runloop once the popover is fully attached.
  dispatch_async(dispatch_get_main_queue(), ^{
    [self configurePopoverWindowForActiveSpace];
    [self.contentController refreshSnapshot];
  });
}

- (void)configurePopoverWindowForActiveSpace {
  NSWindow *popoverWindow = self.popover.contentViewController.view.window;
  if (popoverWindow == nil) {
    return;
  }

  NSWindowCollectionBehavior behavior = popoverWindow.collectionBehavior;
  behavior |= NSWindowCollectionBehaviorMoveToActiveSpace;
  behavior |= NSWindowCollectionBehaviorFullScreenAuxiliary;
  popoverWindow.collectionBehavior = behavior;
}

- (void)popoverWillShow:(NSNotification *)notification {
  [self configurePopoverWindowForActiveSpace];
}

- (void)popoverDidClose:(NSNotification *)notification {
  [self.contentController stopAutoRefresh];
}
@end
static KairosMenubarTarget *kairosTarget = nil;

static NSImage *KairosTemplateIcon(void) {
  NSImage *image = [[NSImage alloc] initWithSize:NSMakeSize(18.0, 18.0)];
  [image lockFocus];

  // Exact Kairos mark geometry from kairos-mark.svg:
  // viewBox 256, r 74, stroke 30, dasharray 350 115, rotate -18deg.
  CGFloat size = 18.0;
  CGFloat scale = size / 256.0;
  CGFloat center = size / 2.0;
  CGFloat radius = 74.0 * scale;

  NSBezierPath *arc = [NSBezierPath bezierPathWithOvalInRect:NSMakeRect(center - radius, center - radius, radius * 2.0, radius * 2.0)];
  arc.lineWidth = 30.0 * scale;
  arc.lineCapStyle = NSLineCapStyleRound;
  arc.lineJoinStyle = NSLineJoinStyleRound;
  CGFloat dashPattern[2] = {350.0 * scale, 115.0 * scale};
  [arc setLineDash:dashPattern count:2 phase:0.0];
  // Match SVG coordinate semantics and apply a slight rightward nudge for menubar parity.
  NSAffineTransform *transform = [NSAffineTransform transform];
  [transform translateXBy:center yBy:center];
  [transform scaleXBy:1.0 yBy:-1.0];
  [transform rotateByDegrees:40.0];
  [transform translateXBy:-center yBy:-center];
  [arc transformUsingAffineTransform:transform];

  [[NSColor blackColor] setStroke];
  [arc stroke];

  [image unlockFocus];
  image.template = YES;
  return image;
}

void kairosInstallMenubar(void) {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (kairosStatusItem != nil) {
      return;
    }

    kairosTarget = [KairosMenubarTarget new];
    kairosTarget.contentController = [KairosMenubarContentController new];
    kairosTarget.popover = [NSPopover new];
    kairosTarget.popover.behavior = NSPopoverBehaviorTransient;
    kairosTarget.popover.contentViewController = kairosTarget.contentController;
    kairosTarget.popover.delegate = kairosTarget;

    kairosStatusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    kairosStatusItem.button.toolTip = @"Kairos";
    kairosStatusItem.button.image = KairosTemplateIcon();
    kairosStatusItem.button.target = kairosTarget;
    kairosStatusItem.button.action = @selector(togglePopover:);
  });
}
