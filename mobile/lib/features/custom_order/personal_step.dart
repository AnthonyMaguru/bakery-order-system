import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/uploads.dart';
import '../../core/theme.dart';
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
  final _picker = ImagePicker();
  bool _uploadingPhoto = false;
  String? _photoError;
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

  Future<void> _pickPhoto() async {
    if (d.photos.length >= 5) {
      setState(() => _photoError = 'You can add up to 5 inspiration photos');
      return;
    }
    setState(() {
      _uploadingPhoto = true;
      _photoError = null;
    });
    try {
      final file = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 82,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      final url = await uploadPhoto(Uint8List.fromList(bytes), contentType: _contentType(file.name));
      if (mounted) setState(() => d.photos = [...d.photos, (bytes: bytes, url: url)]);
    } catch (e) {
      if (mounted) setState(() => _photoError = e.toString());
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  String _contentType(String name) {
    final extension = name.split('.').last.toLowerCase();
    return switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };
  }

  Widget _photos() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FieldLabel('Inspiration photos', optional: true),
        const Text('Show the baker what you have in mind. You can add up to 5.', style: TextStyle(color: AppColors.muted)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (var i = 0; i < d.photos.length; i++)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.memory(d.photos[i].bytes, width: 76, height: 76, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 2,
                    right: 2,
                    child: IconButton(
                      style: IconButton.styleFrom(backgroundColor: Colors.white, minimumSize: const Size(44, 44), padding: EdgeInsets.zero),
                      icon: const Icon(Icons.close, size: 18),
                      tooltip: 'Remove photo',
                      onPressed: () => setState(() => d.photos = [...d.photos]..removeAt(i)),
                    ),
                  ),
                ],
              ),
            if (d.photos.length < 5)
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(minimumSize: const Size(76, 76), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                onPressed: _uploadingPhoto ? null : _pickPhoto,
                icon: _uploadingPhoto ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.add_photo_alternate_outlined),
                label: const Text('Add'),
              ),
          ],
        ),
        if (_photoError != null) ...[
          const SizedBox(height: 8),
          Text(_photoError!, style: const TextStyle(color: AppColors.danger)),
        ],
      ],
    );
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
                  _photos(),
                ],
              ),
            ),
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
