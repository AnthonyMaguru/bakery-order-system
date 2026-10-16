import 'package:flutter/material.dart';

import '../../core/widgets.dart';
import 'draft.dart';
import 'when_step.dart';

/// Step 3: writing, theme and notes. When the customer chose to describe the cake,
/// this is also where they say what it should be like.
class PersonalStep extends StatefulWidget {
  const PersonalStep({super.key, required this.draft});

  final CustomOrderDraft draft;

  @override
  State<PersonalStep> createState() => _PersonalStepState();
}

class _PersonalStepState extends State<PersonalStep> {
  CustomOrderDraft get d => widget.draft;
  late final _inscription = TextEditingController(text: d.inscription);
  late final _theme = TextEditingController(text: d.theme);
  late final _notes = TextEditingController(text: d.notes);
  late final _flavour = TextEditingController(text: d.flavour);
  late final _size = TextEditingController(text: d.size);
  late final _colours = TextEditingController(text: d.colours);

  @override
  void dispose() {
    for (final c in [_inscription, _theme, _notes, _flavour, _size, _colours]) {
      c.dispose();
    }
    super.dispose();
  }

  void _save() {
    d
      ..inscription = _inscription.text
      ..theme = _theme.text
      ..notes = _notes.text
      ..flavour = _flavour.text
      ..size = _size.text
      ..colours = _colours.text;
  }

  Widget _field(String label, TextEditingController controller, {String? hint, int? maxLength, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FieldLabel(label, optional: true),
          TextField(
            controller: controller,
            maxLength: maxLength,
            maxLines: maxLines,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(hintText: hint),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      onPopInvokedWithResult: (_, _) => _save(),
      child: Scaffold(
        appBar: AppBar(),
        body: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            StepHeader(step: 3, title: d.useBuilder ? 'Make it personal' : 'Describe your cake', subtitle: 'Everything here is optional.'),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                children: [
                  if (!d.useBuilder) ...[
                    _field('Flavour', _flavour, hint: 'For example chocolate'),
                    _field('Size', _size, hint: 'For example 2 kg, or how many guests'),
                    _field('Colours', _colours, hint: 'For example pink and gold'),
                  ],
                  _field('Writing on the cake', _inscription, hint: 'For example Happy 5th Birthday Amara', maxLength: 40),
                  _field('Theme or character', _theme, hint: 'For example football, flowers or a cartoon'),
                  _field('Notes for the baker', _notes, hint: 'Allergies, colours to avoid, anything else', maxLines: 3),
                ],
              ),
            ),
            // TODO(mobile lead): inspiration photos, compressed on the phone and uploaded to
            // Firebase Storage, sent as inspirationImageUrls (and designImageUrl for the preview).
          ],
        ),
        bottomNavigationBar: BottomBar(
          child: FilledButton(
            onPressed: () {
              _save();
              Navigator.of(context).push(MaterialPageRoute<void>(settings: const RouteSettings(name: 'custom/4'), builder: (_) => WhenStep(draft: d)));
            },
            child: const Text('Continue'),
          ),
        ),
      ),
    );
  }
}
