import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/bakery.dart';

/// Which days can be picked. Custom cakes need an open slot; ready made ones only
/// need the bakery open and enough days to make them.
sealed class DateRule {}

class CustomCakeRule extends DateRule {}

class ReadyMadeRule extends DateRule {
  ReadyMadeRule(this.leadTimeDays);
  final int leadTimeDays;
}

/// Opens the date picker and returns the chosen due date and time, or null.
Future<DateTime?> pickDueDate(
  BuildContext context, {
  required Bakery bakery,
  required DateRule rule,
  DateTime? initial,
}) {
  return showModalBottomSheet<DateTime>(
    context: context,
    isScrollControlled: true,
    builder: (_) => _DateSheet(bakery: bakery, rule: rule, initial: initial),
  );
}

class _DateSheet extends StatefulWidget {
  const _DateSheet({required this.bakery, required this.rule, this.initial});

  final Bakery bakery;
  final DateRule rule;
  final DateTime? initial;

  @override
  State<_DateSheet> createState() => _DateSheetState();
}

class _DateSheetState extends State<_DateSheet> {
  late Future<List<CalendarDay>> _days = _load();
  late String? _picked = widget.initial == null
      ? null
      : dayKey(widget.initial!);
  List<(int, int)> get _times => widget.bakery.parsedHandoverTimes;
  late (int, int) _time = _initialTime;
  String? _timeError;
  int _month = 0;

  bool get _hasTimeWindow => _times.length >= 2;

  (int, int) get _initialTime {
    if (widget.initial != null) {
      final initial = (widget.initial!.hour, widget.initial!.minute);
      if (_isInsideTimeWindow(initial)) return initial;
    }
    if (_times.isNotEmpty) return _times.first;
    final now = TimeOfDay.now();
    return (now.hour, now.minute);
  }

  bool _isInsideTimeWindow((int, int) time) {
    if (!_hasTimeWindow) return true;
    final minutes = time.$1 * 60 + time.$2;
    final start = _times.first.$1 * 60 + _times.first.$2;
    final end = _times.last.$1 * 60 + _times.last.$2;
    return minutes >= start && minutes <= end;
  }

  Future<void> _chooseTime() async {
    final selected = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: _time.$1, minute: _time.$2),
      helpText: _hasTimeWindow
          ? 'Choose a preferred time in the bakery window'
          : 'Choose a preferred handover time',
    );
    if (selected == null || !mounted) return;
    final time = (selected.hour, selected.minute);
    if (!_isInsideTimeWindow(time)) {
      setState(
        () => _timeError = 'Choose a time within ${timeWindowLabel(_times)}.',
      );
      return;
    }
    setState(() {
      _time = time;
      _timeError = null;
    });
  }

  Future<List<CalendarDay>> _load() async {
    final data =
        await api.get('/bakeries/${widget.bakery.id}/availability?days=92')
            as List;
    return data
        .map((d) => CalendarDay.fromJson(d as Map<String, dynamic>))
        .toList();
  }

  bool _allowed(CalendarDay day) {
    return switch (widget.rule) {
      CustomCakeRule() => day.status == 'OPEN',
      ReadyMadeRule(:final leadTimeDays) =>
        day.status != 'CLOSED' &&
            day.status != 'BLOCKED' &&
            !fromDayKey(day.date).isBefore(
              DateUtils.dateOnly(
                DateTime.now(),
              ).add(Duration(days: leadTimeDays)),
            ),
    };
  }

  String _why(CalendarDay day) => switch (day.status) {
    'CLOSED' => 'closed',
    'BLOCKED' => 'not taking orders',
    'FULL' => 'fully booked',
    _ => 'too soon',
  };

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: FutureBuilder(
          future: _days,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              final offline = snapshot.error is NetworkException;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      offline
                          ? 'Connect to the internet to see which days the bakery has free.'
                          : snapshot.error.toString(),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () {
                        final next = _load();
                        setState(() {
                          _days = next;
                        });
                      },
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              );
            }
            if (!snapshot.hasData) {
              return const Padding(
                padding: EdgeInsets.all(48),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            return _calendar(context, snapshot.data!);
          },
        ),
      ),
    );
  }

  Widget _calendar(BuildContext context, List<CalendarDay> days) {
    final byKey = {for (final d in days) d.date: d};
    final first = fromDayKey(days.first.date);
    final month = DateTime(first.year, first.month + _month);
    final lastMonth = fromDayKey(days.last.date);
    final canNext = DateTime(
      month.year,
      month.month + 1,
    ).isBefore(DateTime(lastMonth.year, lastMonth.month + 1));
    final leading = DateTime(month.year, month.month, 1).weekday - 1;
    final count = DateUtils.getDaysInMonth(month.year, month.month);
    final picked = _picked == null ? null : byKey[_picked];
    final chosen = picked != null && _allowed(picked);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'When do you need it?',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            IconButton(
              onPressed: _month > 0 ? () => setState(() => _month--) : null,
              icon: const Icon(Icons.chevron_left),
              tooltip: 'Previous month',
            ),
            Expanded(
              child: Text(
                '${monthNames[month.month - 1]} ${month.year}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            IconButton(
              onPressed: canNext ? () => setState(() => _month++) : null,
              icon: const Icon(Icons.chevron_right),
              tooltip: 'Next month',
            ),
          ],
        ),
        GridView.count(
          crossAxisCount: 7,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            for (final d in ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
              Center(
                child: Text(
                  d,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.muted,
                  ),
                ),
              ),
            for (var i = 0; i < leading; i++) const SizedBox.shrink(),
            for (var n = 1; n <= count; n++)
              _dayCell(byKey[dayKey(DateTime(month.year, month.month, n))], n),
          ],
        ),
        const SizedBox(height: 4),
        const Wrap(
          spacing: 16,
          children: [
            Text(
              'Greyed out: closed, fully booked or too soon',
              style: TextStyle(fontSize: 13, color: AppColors.ink2),
            ),
          ],
        ),
        const Divider(height: 28),
        const Text(
          'Preferred handover time',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          _hasTimeWindow
              ? 'The bakery can arrange pickup or delivery between ${timeWindowLabel(_times)}. Choose a preferred time; the bakery will confirm it.'
              : 'Choose a preferred time. The bakery will confirm availability and the exact handover time.',
          style: const TextStyle(fontSize: 13, color: AppColors.ink2),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _chooseTime,
          icon: const Icon(Icons.schedule),
          label: Text(timeLabel(DateTime(2000, 1, 1, _time.$1, _time.$2))),
        ),
        if (_timeError != null) ...[
          const SizedBox(height: 4),
          Text(
            _timeError!,
            style: const TextStyle(color: AppColors.danger, fontSize: 13),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: chosen
              ? () {
                  final day = fromDayKey(_picked!);
                  Navigator.of(context).pop(
                    DateTime(day.year, day.month, day.day, _time.$1, _time.$2),
                  );
                }
              : null,
          child: Text(
            chosen
                ? 'Request ${dayLabel(fromDayKey(_picked!))}, ${timeLabel(DateTime(2000, 1, 1, _time.$1, _time.$2))}'
                : 'Pick a day',
          ),
        ),
      ],
    );
  }

  Widget _dayCell(CalendarDay? day, int n) {
    if (day == null) {
      return Center(
        child: Text('$n', style: const TextStyle(color: Color(0xFFB9A89D))),
      );
    }
    final allowed = _allowed(day);
    final selected = day.date == _picked;
    return Semantics(
      button: true,
      enabled: allowed,
      selected: selected,
      label:
          '${dayLabel(fromDayKey(day.date))}${allowed ? '' : ', ${_why(day)}'}',
      child: InkResponse(
        onTap: allowed ? () => setState(() => _picked = day.date) : null,
        radius: 22,
        child: Center(
          child: Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? AppColors.accent : null,
              shape: BoxShape.circle,
            ),
            child: Text(
              '$n',
              style: TextStyle(
                fontSize: 15,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected
                    ? Colors.white
                    : allowed
                    ? AppColors.ink
                    : const Color(0xFFB9A89D),
                decoration: day.status == 'FULL'
                    ? TextDecoration.lineThrough
                    : null,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
