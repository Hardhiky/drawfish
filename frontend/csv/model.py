import chess
import chess.engine
import random
import csv

def generate_dataset(num_positions, output_file):
    engine = chess.engine.SimpleEngine.popen_uci("/usr/bin/stockfish")
    dataset = []

    while len(dataset) < num_positions:
        board = chess.Board()
        move_count = 0  # Track the number of moves to enforce the fifty-move rule

        while not board.is_game_over():
            # Play a random move
            legal_moves = list(board.legal_moves)
            move = random.choice(legal_moves)
            board.push(move)
            move_count += 1

            # Analyze the position
            info = engine.analyse(board, chess.engine.Limit(time=0.1))
            score = info["score"].relative.score(mate_score=10000)

            # Check if the position is drawish
            if is_drawish_position(board, score, move_count):
                features = extract_features(board)
                label = 1  # Label as drawish
                dataset.append(features + [label])  # Append label to the feature list
                print(f"Drawish position found! Dataset size: {len(dataset)}")

            # Add non-drawish positions
            elif score is not None and abs(score) > 50:  # Non-drawish positions
                features = extract_features(board)
                label = 0  # Label as non-drawish
                dataset.append(features + [label])  # Append label to the feature list
                print(f"Non-drawish position found! Dataset size: {len(dataset)}")

            # Stop generating positions if the dataset reaches the desired size
            if len(dataset) >= num_positions:
                break

    engine.quit()

    # Save the dataset to a CSV file
    save_to_csv(output_file, dataset)

def is_drawish_position(board, score, move_count):
    """
    Check if the position is drawish based on multiple criteria.
    """
    # 1. Evaluation score close to 0 (centipawns)
    if score is not None and abs(score) <= 50:
        return True

    # 2. Stalemate
    if board.is_stalemate():
        return True

    # 3. Insufficient material
    if board.is_insufficient_material():
        return True

    # 4. Threefold repetition
    if board.can_claim_threefold_repetition():
        return True

    # 5. Fifty-move rule
    if board.halfmove_clock >= 100:  # 50 moves per side
        return True

    return False

def extract_features(board):
    """
    Extract features from the board for machine learning.
    """
    features = []
    features.append(len(board.pieces(chess.PAWN, chess.WHITE)))  # White pawns
    features.append(len(board.pieces(chess.PAWN, chess.BLACK)))  # Black pawns
    features.append(len(board.pieces(chess.KNIGHT, chess.WHITE)))  # White knights
    features.append(len(board.pieces(chess.KNIGHT, chess.BLACK)))  # Black knights
    features.append(len(board.pieces(chess.BISHOP, chess.WHITE)))  # White bishops
    features.append(len(board.pieces(chess.BISHOP, chess.BLACK)))  # Black bishops
    features.append(len(board.pieces(chess.ROOK, chess.WHITE)))  # White rooks
    features.append(len(board.pieces(chess.ROOK, chess.BLACK)))  # Black rooks
    features.append(len(board.pieces(chess.QUEEN, chess.WHITE)))  # White queens
    features.append(len(board.pieces(chess.QUEEN, chess.BLACK)))  # Black queens
    features.append(int(board.turn))  # Whose turn it is (1 for White, 0 for Black)
    features.append(int(board.is_check()))  # Whether the king is in check
    features.append(board.fullmove_number)  # Number of full moves
    features.append(board.halfmove_clock)  # Halfmove clock for fifty-move rule
    return features

def save_to_csv(output_file, dataset):
    """
    Save the dataset to a CSV file.
    """
    # Define column headers
    headers = [
        "White Pawns", "Black Pawns",
        "White Knights", "Black Knights",
        "White Bishops", "Black Bishops",
        "White Rooks", "Black Rooks",
        "White Queens", "Black Queens",
        "Turn", "Is Check", "Full Move Number", "Halfmove Clock",
        "Label"  # 1 for drawish, 0 for non-drawish
    ]

    # Write to CSV
    with open(output_file, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(headers)  # Write the header row
        writer.writerows(dataset)  # Write the data rows

# Generate 10,000 positions (balanced between drawish and non-drawish)
generate_dataset(10000, "balanced_drawish_dataset.csv")
